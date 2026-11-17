import HomeEntrance from './HomeEntrance.tsx';
import { PixelCharacter } from './PixelCharacters.tsx';
import './About.css';

export default function About() {
    return (
        <HomeEntrance>
            <section className="about-detail" aria-labelledby="about-title">
                <h1 id="about-title" data-home-reveal>
                    About
                </h1>

                <div className="about-detail-lead">
                    <figure
                        className="about-detail-scene"
                        aria-hidden="true"
                        data-home-reveal
                        data-home-delay="100"
                    >
                        <span className="about-detail-scene-dot about-detail-scene-dot--one" />
                        <span className="about-detail-scene-dot about-detail-scene-dot--two" />
                        <PixelCharacter
                            kind="human"
                            size={108}
                            className="pixel-greeting about-detail-character"
                        />
                        <svg
                            className="about-detail-ground"
                            viewBox="0 0 180 32"
                            fill="none"
                            shapeRendering="crispEdges"
                        >
                            <path
                                d="M15 22h150M35 28h18m55 0h28"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                            <path
                                d="M141 20v-8m0 3h-6v-4h6m0 1h6V8h-6m0 1V5"
                                className="about-detail-plant"
                                strokeWidth="3"
                            />
                            <path d="M136 20h10v7h-10z" fill="currentColor" />
                            <path
                                d="M11 19h3v3h-3zm148 7h3v3h-3z"
                                fill="currentColor"
                            />
                        </svg>
                    </figure>

                    <div
                        className="about-detail-intro"
                        data-home-reveal
                        data-home-delay="60"
                    >
                        <p className="about-detail-first">
                            Hi, I'm Rouvin. I am an offensive security engineer
                            working in the Singapore government.
                        </p>
                        <p>
                            I've been on both sides of bug bounty, finding bugs
                            and triaging reports on HackerOne for PayPal. These
                            days, I look into ways to improve black-box testing.
                            I also enjoy building tools to find bugs and make my
                            team's work easier.
                        </p>
                        <p>
                            I write about whatever I find cool or get curious
                            about, and am always keen to learn. Outside of
                            security, I enjoy travelling, cooking, trying new
                            food and working out.
                        </p>
                    </div>
                </div>

                <div
                    className="about-detail-links"
                    data-home-reveal
                    data-home-delay="190"
                >
                    <p>
                        My old CTF writeups and course reviews are still in my{' '}
                        <a href="https://rouvin.gitbook.io/ibreakstuff/">
                            GitBook
                        </a>
                        .
                    </p>
                    <p>
                        Find me on{' '}
                        <a href="https://github.com/rouvinerh">GitHub</a> and{' '}
                        <a href="https://linkedin.com/in/rouvinerh">LinkedIn</a>
                        . Feel free to reach out by{' '}
                        <a href="mailto:erhrouvin@gmail.com">email</a>.
                    </p>
                </div>
            </section>
        </HomeEntrance>
    );
}
