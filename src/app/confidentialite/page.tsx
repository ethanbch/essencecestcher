import type { Metadata } from "next";
import { ClearLocalData } from "@/components/ClearLocalData";
import { LegalPage } from "@/components/LegalPage";
import { contactHref, contactLabel, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Confidentialité",
  alternates: { canonical: "/confidentialite" },
};

export default function Confidentialite() {
  return (
    <LegalPage title="Confidentialité">
      <p className="lead">
        En bref : pas de compte, pas de cookie, pas de mesure d&apos;audience, pas de publicité. Rien de ce que vous saisissez
        n&apos;est conservé sur nos serveurs.
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Le site ne dépose <strong>aucun cookie</strong>, ni de mesure d&apos;audience, ni publicitaire, ni de réseau social. Aucun
        bandeau de consentement n&apos;est donc nécessaire.
      </p>
      <p>
        Pour vous éviter de tout ressaisir, votre navigateur mémorise localement (<em>localStorage</em>) vos préférences : carburant,
        rayon, détour maximal, consommation du véhicule, ainsi que vos 4 dernières adresses recherchées. Ces informations restent
        sur votre appareil, ne nous sont jamais transmises et ne servent qu&apos;à personnaliser l&apos;interface à votre demande.
        Vous pouvez les effacer à tout moment :
      </p>
      <ClearLocalData />

      <h2>Recherche d&apos;adresse et géolocalisation</h2>
      <ul>
        <li>
          Les caractères que vous tapez dans les champs d&apos;adresse sont envoyés directement depuis votre navigateur au service de
          géocodage de la Géoplateforme de l&apos;IGN (<em>data.geopf.fr</em>) pour proposer des suggestions.
        </li>
        <li>
          Le bouton « Me localiser » utilise la géolocalisation de votre navigateur, uniquement si vous l&apos;autorisez. Votre
          position sert à lancer la recherche et à retrouver l&apos;adresse correspondante auprès de l&apos;IGN ; elle n&apos;est pas
          enregistrée.
        </li>
        <li>
          Les coordonnées du lieu recherché (ou le tracé du trajet) sont envoyées à notre serveur pour sélectionner les stations
          proches. Elles ne sont pas conservées. En mode trajet, les points de départ et d&apos;arrivée sont transmis au service
          d&apos;itinéraire de l&apos;IGN.
        </li>
        <li>
          Les coordonnées figurent dans l&apos;adresse de la page pour que vous puissiez la partager : n&apos;envoyez le lien
          qu&apos;aux personnes à qui vous voulez communiquer ce lieu.
        </li>
      </ul>

      <h2>Services tiers</h2>
      <ul>
        <li>
          <strong>Hébergement</strong> : {SITE.host.name} (États-Unis). Comme tout hébergeur, Vercel enregistre des journaux
          techniques (adresse IP, page demandée) conservés pour une durée limitée à des fins de sécurité et de fonctionnement. Les
          transferts vers les États-Unis sont encadrés par le Data Privacy Framework UE–États-Unis.
        </li>
        <li>
          <strong>Carte</strong> : les tuiles sont chargées depuis OpenFreeMap, qui reçoit donc l&apos;adresse IP de votre appareil.
        </li>
        <li>
          <strong>Géocodage et itinéraires</strong> : Géoplateforme de l&apos;IGN (établissement public français).
        </li>
        <li>
          <strong>Navigation</strong> : les boutons « Y aller » ouvrent Google Maps, Waze ou Plans uniquement lorsque vous cliquez
          dessus ; leurs propres politiques de confidentialité s&apos;appliquent alors.
        </li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Aucune donnée personnelle n&apos;étant conservée par le site, il n&apos;y a en pratique rien à consulter, rectifier ou
        supprimer de notre côté. Pour toute question, écrivez-nous :{" "}
        <a href={contactHref} target="_blank" rel="noreferrer">
          {contactLabel}
        </a>
        . Vous pouvez aussi adresser une réclamation à la{" "}
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
          CNIL
        </a>
        .
      </p>
    </LegalPage>
  );
}
