import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { contactHref, contactLabel, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur</h2>
      {SITE.editorName ? (
        <p>
          Le site {SITE.name} est édité à titre non professionnel par {SITE.editorName}.
        </p>
      ) : (
        <p>
          Le site {SITE.name} est édité à titre non professionnel par un particulier. Conformément à l&apos;article 6, III-2 de la loi
          n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique, ses coordonnées ont été communiquées à
          l&apos;hébergeur ci-dessous.
        </p>
      )}
      <p>
        Contact :{" "}
        <a href={contactHref} target="_blank" rel="noreferrer">
          {contactLabel}
        </a>
      </p>
      <p>Le site est gratuit, sans compte, sans publicité et sans but commercial.</p>

      <h2>Hébergement</h2>
      <p>
        {SITE.host.name}
        <br />
        {SITE.host.address}
        <br />
        <a href={SITE.host.website} target="_blank" rel="noreferrer">
          {SITE.host.website.replace("https://", "")}
        </a>
      </p>

      <h2>Sources des données et licences</h2>
      <ul>
        <li>
          <strong>Prix des carburants</strong> : Ministère de l&apos;Économie, des Finances et de la Souveraineté industrielle et
          numérique —{" "}
          <a href="https://www.prix-carburants.gouv.fr/rubrique/opendata/" target="_blank" rel="noreferrer">
            prix-carburants.gouv.fr
          </a>
          , sous{" "}
          <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/" target="_blank" rel="noreferrer">
            Licence Ouverte / Open Licence 2.0
          </a>
          . Données récupérées chaque matin ; la date de chaque prix est affichée sur la fiche de la station. Les noms et enseignes
          des stations proviennent des fiches publiques du même site.
        </li>
        <li>
          <strong>Adresses et itinéraires</strong> : Géoplateforme de l&apos;IGN (Base Adresse Nationale, service d&apos;itinéraire),
          sous Licence Ouverte 2.0.
        </li>
        <li>
          <strong>Fond de carte</strong> : © contributeurs{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{" "}
          (ODbL), tuiles{" "}
          <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
            OpenFreeMap
          </a>{" "}
          / OpenMapTiles.
        </li>
      </ul>

      <h2>Avertissement sur les prix</h2>
      <p>
        Les prix sont déclarés par les stations elles-mêmes et publiés par l&apos;État. Ils sont fournis à titre indicatif : ils
        peuvent avoir changé depuis leur dernière mise à jour, et seul le prix affiché à la pompe fait foi. Les prix de plus de 7 jours
        sont exclus du classement. Les estimations (coût d&apos;un plein, carburant nécessaire pour un trajet, détour) reposent sur
        des hypothèses simplifiées et ne constituent pas un engagement. L&apos;éditeur ne saurait être tenu responsable d&apos;une
        erreur, d&apos;une indisponibilité du service ou d&apos;une décision prise sur la base des informations affichées.
      </p>

      <h2>Marques</h2>
      <p>
        Les noms, marques et logos des enseignes de distribution de carburant appartiennent à leurs propriétaires respectifs. Ils
        sont reproduits uniquement pour identifier les stations. Le site n&apos;est affilié à aucune de ces enseignes ni à
        l&apos;administration.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code source du site est disponible sur{" "}
        <a href={SITE.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . Les textes et éléments graphiques propres au site ne peuvent être reproduits sans autorisation.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le site ne dépose aucun cookie et ne conserve aucune donnée personnelle. Voir la <Link href="/confidentialite">politique de
        confidentialité</Link>.
      </p>
    </LegalPage>
  );
}
