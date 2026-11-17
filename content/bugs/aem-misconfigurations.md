# AEM misconfigurations

## Summary

I've found a few AEM sites exposing internal content through JSON responses. In one case, adding a trailing `/` to a blocked request let me browse an intranet and download files marked Confidential. The same misconfiguration turned up on other sites in that region, allowing me to farm more than 14 reports using the exact same methods and bypasses.

## AEM

Adobe Experience Manager is a content management system. It uses Apache Sling to turn a URL into a request for a content resource, often stored in a Java Content Repository (JCR).

A Sling URL has a few parts. For an existing `/content/example` resource, it can look like this:

![](/images/bugs/aem-url-parts.svg)

Parts of a Sling URL

The `.infinity` part is a selector, `.json` is the extension, and `/a.css` is the suffix. That last bit matters when looking at filter bypasses. [Sling's documentation](https://sling.apache.org/documentation/the-sling-engine/url-decomposition.html) explains the rules, including how the resource structure affects this split.

## The finding

The company had separate sites for different regions, and one of them used AEM. I started with a wordlist of common AEM paths and found that `/content/.json` returned metadata for the content node.

I tried `/content/.children.json` to see what was underneath it, but got a `403`. Adding a slash to make it `/content/.children.json/` worked. The response listed child nodes, which gave me more paths to follow.

One of those was `/content/intranet`. Visiting `/content/intranet/index` directly gave me another `403`, so I tried requesting it through a different selector:

```text
/content/intranet.pages.json/
```

This returned its contents. I continued through the child paths, including `/content/intranet/information.pages.json`, and found HTML from the intranet in a `text` field.

There were also file URLs in the responses. Following those let me download documents marked Confidential. I included the readable intranet content and documents in the report, which was assessed as High severity.

## Cause

The JSON responses make more sense once you look at Sling's `DefaultGetServlet`. It can render a resource as JSON if no more specific servlet handles the request. `.tidy` formats the output, while a number or `.infinity` controls how far it follows child resources, within configured limits. [The servlet documentation](https://sling.apache.org/documentation/bundles/rendering-content-default-get-servlets.html) covers those options.

I also checked `/bin/querybuilder.json`. It can search repository content and return properties using parameters such as `path` and `p.hits=full`. [Adobe's QueryBuilder documentation](https://experienceleague.adobe.com/en/docs/experience-manager-65-lts/content/implementing/developing/platform/query-builder/querybuilder-api) has examples. For this these targets, it did not return anything.

Both still depend on repository permissions. A public page returned as JSON can be perfectly intentional.

## Filters

Dispatcher filters requests before they reach AEM. A loose URL rule can miss the difference between an extension and a suffix. For example, these are worth comparing:

```text
/content/example.infinity.json
/content/example.infinity.json/a.css
```

A rule allowing anything ending in `.css` might accept the second request, while Sling still sees a JSON extension.

![](/images/bugs/aem-filter-mismatch.svg)

The filter sees CSS while Sling sees JSON

That depends on the site's configuration. In the finding above, a trailing slash was enough. I couldn't tell which exact filter rule caused it from the responses alone. Adobe supports [filtering the path, selectors, extension and suffix separately](https://experienceleague.adobe.com/en/docs/experience-manager-dispatcher/using/configuring/dispatcher-configuration#configuring-access-to-content-filter).

## Fixes

Protect the content with [repository permissions](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/headless/deployment/dispatcher), so anonymous users cannot read it even if a request passes Dispatcher.

For Dispatcher, [allow only the requests the site needs](https://experienceleague.adobe.com/en/docs/experience-manager-dispatcher/using/getting-started/security-checklist). Check alternate selectors, suffixes and trailing slashes when testing the rules. Clear affected caches after changing filters, and check other sites using the same setup.

This issue has many bypasses, such as `.xml`, `.json/a.xml`, adding more `/` characters.