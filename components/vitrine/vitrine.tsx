"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./vitrine.css";

const BANDEAU: [string, string][] = [
  ["R.489", "Chariot automoteur"],
  ["R.482", "Engins de chantier · R.487 grue à tour"],
  ["R.484", "Pont roulant · R.485 gerbeur"],
  ["R.483", "Grue mobile · R.486 PEMP · R.490 camion-grue"],
  ["R.489", "Chariot automoteur"],
];

const CHAPITRES = ["hero", "chantier", "entrepot", "familles", "connexion"];
const LABELS = ["Accueil", "Le chantier", "L'entrepôt", "Les familles d'engins", "Connexion"];

export function Vitrine({ name }: { name: string }) {
  const [chap, setChap] = useState(0);

  useEffect(() => {
    const canvas = document.getElementById("scene") as HTMLCanvasElement | null;
    let stop = () => {};
    let cancelled = false;
    // three.js is loaded after the first paint so the text and buttons show up at once.
    if (canvas) {
      void import("./scene").then(({ startScene }) => {
        if (!cancelled) stop = startScene(canvas);
      });
    }
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  useEffect(() => {
    const sections = CHAPITRES.map((id) => document.getElementById(id));
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let current = 0;
      sections.forEach((sec, i) => {
        if (!sec) return;
        const r = sec.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) current = i;
      });
      setChap(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="vitrine">
      <canvas id="scene" aria-hidden="true" />

      <header className="nav">
        <a className="marque" href="#hero" aria-label={`${name}, accueil`}>
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
            <rect width="40" height="40" rx="9" fill="#FACC15" />
            <path d="M27 13.5a9 9 0 1 0 0 13" fill="none" stroke="#172554" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M19 20.5l3 3 6.5-7" fill="none" stroke="#172554" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {name}
        </a>
        <span className="espace" />
        <Link className="btn" href="/connexion">
          Se connecter
        </Link>
      </header>

      <nav className="jauge" aria-label="Chapitres">
        {CHAPITRES.map((id, i) => (
          <a key={id} href={`#${id}`} aria-label={LABELS[i]} className={i === chap ? "actif" : undefined} />
        ))}
      </nav>

      <div className="bandeau" role="status">
        <b>{BANDEAU[chap]?.[0]}</b>
        <span>{BANDEAU[chap]?.[1]}</span>
      </div>

      <main>
        <section className="chapitre" id="hero">
          <div className="carte">
            <p className="etiquette"><span className="pastille" />Logiciel des organismes testeurs</p>
            <h1>Votre chantier de tests, enfin sous contrôle.</h1>
            <p className="detail">
              Sessions, candidats, grilles d&apos;évaluation et certificats CACES® : tout tient dans un seul outil, y
              compris sans réseau sur la tablette.
            </p>
            <div className="actions">
              <Link className="btn" href="/inscription">Inscrire mon organisme</Link>
              <a className="btn contour" href="#chantier">Visiter le chantier</a>
            </div>
          </div>
        </section>

        <section className="chapitre droite" id="chantier">
          <div className="carte">
            <p className="etiquette"><span className="pastille" style={{ ["--c" as string]: "var(--f482)" }} />R.482 · R.487 · Engins de chantier</p>
            <h2>Chaque candidat a son engin, sa grille, son testeur.</h2>
            <p className="detail">
              Planifiez la session, affectez le testeur et l&apos;engin, importez les candidats d&apos;un fichier. Le
              testeur ouvre la tablette et trouve tout prêt.
            </p>
          </div>
        </section>

        <section className="chapitre" id="entrepot">
          <div className="carte">
            <p className="etiquette"><span className="pastille" style={{ ["--c" as string]: "var(--f484)" }} />R.484 · R.489 · Entrepôt de preuves</p>
            <h2>Tout est rangé dans l&apos;entrepôt, rien ne se perd.</h2>
            <p className="detail">
              Identité contrôlée, grille signée, certificat avec QR code : le dossier est conservé, exportable pour
              l&apos;audit en un clic.
            </p>
          </div>
        </section>

        <section className="chapitre droite" id="familles">
          <div className="carte">
            <p className="etiquette"><span className="pastille" style={{ ["--c" as string]: "var(--f486)" }} />Une couleur par famille</p>
            <h2>Les huit familles d&apos;engins, reconnues d&apos;un coup d&apos;œil.</h2>
            <ul className="familles">
              {[
                ["482", "Chantier"], ["483", "Grues mobiles"], ["484", "Ponts roulants"], ["485", "Gerbeurs"],
                ["486", "PEMP"], ["487", "Grues à tour"], ["489", "Chariots"], ["490", "Chargement"],
              ].map(([code, label]) => (
                <li key={code} style={{ ["--c" as string]: `var(--f${code})` }}>
                  <i /><b>R.{code}</b>{label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="chapitre" id="connexion">
          <div className="carte">
            <p className="etiquette"><span className="pastille" />Accès à votre organisme</p>
            <h2>Prêt à monter dans l&apos;engin ?</h2>
            <p className="detail">Connectez-vous pour retrouver vos sessions, ou créez le compte de votre organisme en quelques minutes.</p>
            <div className="actions">
              <Link className="btn sombre" href="/connexion">Accéder à mon espace</Link>
              <Link className="btn contour" href="/inscription">Inscrire mon organisme</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="pied">
        CACES® est une marque déposée de la Cnam. {name} n&apos;est ni affilié à la Cnam ni approuvé par elle.
      </footer>
    </div>
  );
}
