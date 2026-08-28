"""
Le banc du plancher de fabrication — les cas de la matrice, sans réseau.

Rien ici ne joint un fournisseur, ne dépense un centime ni n'écrit sur un
backend : le microservice est joué par un `httpx.MockTransport` qui note ce
qu'on lui demande. Ce qui est éprouvé n'est pas Azure ni MarianMT — c'est le
BANC : qu'il choisisse les bonnes cibles, qu'il refuse de mesurer en mode
dégradé, qu'il sorte le démarrage à froid des percentiles, qu'il compte la
paire pivotée à part, qu'il annonce un dépassement de plafond comme une limite
et non comme une panne, et qu'aucun chiffre n'entre au rapport sans sa méthode.

Règle de fabrication de ces épreuves : **le chemin d'échec doit être PARCOURU**,
jamais simulé en construisant à la main l'objet qu'il aurait produit. Une
épreuve qui fabrique elle-même un `Mesure(issue=ECHEC)` ne prouve rien sur les
lignes qui décident qu'une mesure a échoué.
"""

from __future__ import annotations

import ast
import asyncio
import json
import sys
from pathlib import Path

import httpx
import pytest

RACINE_MICROSERVICE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RACINE_MICROSERVICE))

import bench_fabrication as banc  # noqa: E402

CORPUS_REEL = RACINE_MICROSERVICE.parent / "content" / "translations" / "source"


# ── Fabrique de corpus synthétique ──────────────────────────────────────────


def _texte(longueur: int, graine: str) -> str:
    """Un texte de narration plausible : des phrases terminées, assez longues
    pour que le découpage du portail s'exerce réellement."""
    phrase = f"Regarde {graine} et avance de quelques pas vers la place voisine. "
    texte = (phrase * (longueur // len(phrase) + 1))[:longueur]
    return texte[:-1] + "."  # longueur exacte, et une phrase qui se termine


def _visite(tour_id: str, ville: str, titre: str, longueurs: list[int]) -> dict:
    scenes = []
    for i, n in enumerate(longueurs):
        texte = _texte(n, f"la scène {i} de {ville}")
        scenes.append(
            {
                "sceneId": f"{tour_id}-scene-{i}",
                "index": i,
                "title": f"Station {i}",
                "text": texte,
                "chars": len(texte),
            }
        )
    return {
        "tourId": tour_id,
        "city": ville,
        "title": titre,
        "baseLanguage": "fr",
        "chars": sum(s["chars"] for s in scenes),
        "scenes": scenes,
    }


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    """Corpus source portant les deux cibles nommées, plus deux leurres qui
    encadrent la cible médiane — sans eux, sa médianité serait triviale."""
    racine = tmp_path / "source"
    racine.mkdir()
    visites = [
        _visite(banc.ID_VISITE_MEDIANE, "Reims", "Reims — La ville-manifeste",
                [1516, 1021, 977, 998, 1013, 980, 1008, 1455]),
        _visite(banc.ID_VISITE_HORS_NORME, "Grasse", "Grasse — Les Routes du Parfum",
                [6539, 7308, 6809, 5350, 5370, 6929, 6552]),
        # Deux plus courtes et deux plus longues que la cible : sans elles, sa
        # médianité serait triviale. Le compte est IMPAIR pour que la médiane
        # tombe sur une Visite réelle plutôt qu'entre deux.
        _visite("seed-100-court", "Bayonne", "Bayonne — Court", [1100, 1200, 2327]),
        _visite("seed-100-moyen-court", "Albi", "Albi — Moyen court", [1500, 1600, 1700, 1800]),
        _visite("seed-100-long", "Rouen", "Rouen — Long",
                [1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400]),
    ]
    for v in visites:
        (racine / f"{v['tourId']}.json").write_text(
            json.dumps(v, ensure_ascii=False), encoding="utf-8"
        )
    return racine


@pytest.fixture
def corpus_traduit(tmp_path: Path, corpus: Path) -> Path:
    """Corpus retraduit — le texte que la synthèse envoie réellement."""
    racine = tmp_path / "out"
    racine.mkdir()
    for chemin in corpus.glob("*.json"):
        source = json.loads(chemin.read_text(encoding="utf-8"))
        traduit = {
            "tourId": source["tourId"],
            "de": {
                "title": source["title"],
                "description": "",
                "scenes": [
                    {"sceneId": s["sceneId"], "title": s["title"], "text": s["text"] + " Ja."}
                    for s in source["scenes"]
                ],
            },
        }
        (racine / chemin.name).write_text(json.dumps(traduit, ensure_ascii=False), encoding="utf-8")
    return racine


def _args(corpus: Path, corpus_traduit: Path, tmp_path: Path, *extra: str):
    return banc.analyser_arguments(
        [
            "--corpus", str(corpus),
            "--corpus-traduit", str(corpus_traduit),
            "--sortie", str(tmp_path / "mesures"),
            "--base", "http://banc.invalide",
            *extra,
        ]
    )


# ── Sélection des cibles ────────────────────────────────────────────────────


class TestSelectionDesCibles:
    def test_resout_les_deux_cibles_nommees(self, corpus):
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        assert cibles.mediane.tour_id == banc.ID_VISITE_MEDIANE
        assert len(cibles.mediane.scenes) == 8
        assert cibles.hors_norme.tour_id == banc.ID_VISITE_HORS_NORME
        # La Scène mesurée est la plus longue de la cible, pas la première.
        assert cibles.scene_hors_norme.chars == 7308

    def test_la_medianite_est_derivee_et_non_affirmee(self, corpus):
        # `ID_VISITE_MEDIANE` est en dur — l'affirmation « c'est la médiane »,
        # elle, se vérifie sur le corpus à chaque exécution.
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        m = cibles.medianite
        assert m["est_la_mediane"] is True
        assert m["chars_cible"] == m["chars_median_du_corpus"]
        assert 0 < m["rang"] < m["nb_visites"]

    def test_une_cible_non_mediane_est_denoncee_comme_telle(self, corpus):
        # Si la story nommait la mauvaise Visite, le rapport le dirait.
        cibles = banc.selectionner_cibles(
            banc.charger_corpus(corpus), id_mediane="seed-100-court"
        )
        assert cibles.medianite["est_la_mediane"] is False
        assert cibles.medianite["ecart_a_la_mediane"] < 1

    def test_derive_la_singularite_au_lieu_de_la_recopier(self, corpus):
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        assert cibles.singularite["possede_les_n_plus_longues"] is True
        assert cibles.singularite["n"] == 7
        assert cibles.singularite["hors_seed"] is True
        assert cibles.singularite["nb_visites_hors_seed"] == 1
        assert cibles.singularite["chars_premiere_scene_hors_cible"] == 2327

    def test_la_singularite_porte_la_visite_et_pas_seulement_la_scene(self, corpus):
        # Le coût de fabrication se paie par Visite : une Visite cinq fois la
        # médiane coûte plus qu'une Scène six fois la Scène médiane.
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        assert cibles.singularite["visite_chars"] == cibles.hors_norme.chars_reels
        assert cibles.singularite["visite_ecart_a_la_mediane"] > 4

    def test_cible_absente_arrete_le_banc_en_la_nommant(self, corpus):
        (corpus / f"{banc.ID_VISITE_HORS_NORME}.json").unlink()
        with pytest.raises(banc.ErreurCorpus) as exc:
            banc.selectionner_cibles(banc.charger_corpus(corpus))
        assert banc.ID_VISITE_HORS_NORME in str(exc.value)
        assert "remplacement" in str(exc.value)

    def test_corpus_absent_ou_vide(self, tmp_path):
        with pytest.raises(banc.ErreurCorpus):
            banc.charger_corpus(tmp_path / "nulle-part")
        vide = tmp_path / "vide"
        vide.mkdir()
        with pytest.raises(banc.ErreurCorpus):
            banc.charger_corpus(vide)

    def test_les_deux_distributions_sont_publiees(self, corpus):
        stats = banc.statistiques_corpus(banc.charger_corpus(corpus))
        assert stats["chars_min"] < stats["chars_median"] < stats["chars_max"]
        assert stats["visite_chars_min"] < stats["visite_chars_median"] < stats["visite_chars_max"]
        # Les deux ne disent pas la même chose : la Visite hors norme domine la
        # seconde bien plus que sa Scène ne domine la première.
        assert stats["visite_chars_max"] > stats["chars_max"]


@pytest.mark.skipif(not CORPUS_REEL.is_dir(), reason="corpus réel absent du poste")
class TestCorpusReel:
    """Alarme de dérive. Le banc mesure sur DEUX cibles nommées ; si le corpus
    cesse de les porter avec les caractéristiques qui les ont fait choisir, la
    mesure cesse d'être comparable — et il vaut mieux l'apprendre ici."""

    def test_les_deux_cibles_ont_les_caracteristiques_annoncees(self):
        visites = banc.charger_corpus(CORPUS_REEL)
        cibles = banc.selectionner_cibles(visites)
        assert len(cibles.mediane.scenes) == 8
        assert cibles.mediane.chars_reels == 8968
        assert cibles.scene_hors_norme.chars == 7308
        assert cibles.singularite["possede_les_n_plus_longues"] is True
        assert cibles.singularite["nb_visites_hors_seed"] == 1

    def test_reims_est_bien_la_visite_mediane_du_corpus_reel(self):
        cibles = banc.selectionner_cibles(banc.charger_corpus(CORPUS_REEL))
        assert cibles.medianite["est_la_mediane"] is True

    def test_la_scene_hors_norme_reste_sous_le_plafond_facturable(self):
        cibles = banc.selectionner_cibles(banc.charger_corpus(CORPUS_REEL))
        factures = banc.billed_characters(cibles.scene_hors_norme.texte)
        assert factures < banc.MAX_BILLABLE_CHARS
        assert len(cibles.scene_hors_norme.texte) < banc.PLAFOND_TEXTE_TTS


# ── Découpage en phrases — miroir du portail ────────────────────────────────


class TestDecoupage:
    def test_texte_court_part_en_une_seule_phrase(self):
        assert banc.decouper_en_phrases("Bonjour, te voilà.") == ["Bonjour, te voilà."]

    def test_texte_long_est_decoupe_en_phrases(self):
        texte = " ".join(f"Voici la phrase numéro {i} de cette narration." for i in range(12))
        phrases = banc.decouper_en_phrases(texte)
        assert len(phrases) == 12
        assert all(p.endswith(".") for p in phrases)

    def test_les_balises_break_ne_sont_pas_traduites(self):
        texte = (
            "Place-toi devant la façade et regarde bien les motifs sculptés. "
            "Ils racontent une histoire ancienne que peu de gens remarquent. "
            '<break time="3s"/>'
            "Maintenant avance vers la place voisine, sans te presser du tout. "
            "Tu vas y trouver la suite de ce récit, et elle vaut le détour."
        )
        phrases = banc.decouper_en_phrases(texte)
        assert all("break" not in p for p in phrases)
        assert len(phrases) >= 2


# ── Paires de traduction ────────────────────────────────────────────────────


class TestPaires:
    def test_paire_directe_charge_un_seul_modele(self):
        assert banc.modeles_requis("fr", "de") == ["fr-de"]
        assert banc.est_pivotee("fr", "de") is False

    def test_paire_pivotee_coute_deux_inferences(self):
        assert banc.modeles_requis("fr", "it") == ["fr-en", "en-it"]
        assert banc.est_pivotee("fr", "it") is True
        assert banc.pivot_de("fr", "it") == "en"

    def test_paire_absente_arrete_le_banc_en_la_nommant(self):
        with pytest.raises(banc.PaireNonSupportee) as exc:
            banc.modeles_requis("fr", "nl")
        assert "fr→nl" in str(exc.value)


class TestContratDeLApiRecopie:
    """Tout ce que le banc recopie du service est épinglé ici. Une copie non
    épinglée est une bombe à retardement : elle reste vraie jusqu'au jour où
    elle ne l'est plus, et rien ne le dit."""

    @pytest.fixture
    def local_server(self, monkeypatch):
        monkeypatch.setenv("MICROSERVICE_API_KEY", "epreuve")
        try:
            import local_server  # noqa: PLC0415
        except Exception as exc:  # noqa: BLE001
            pytest.skip(f"local_server non importable sur ce poste : {exc}")
        return local_server

    def test_les_tables_marian_ne_derivent_pas(self, local_server):
        assert banc.MARIAN_PAIRES == set(local_server.MARIAN_MODELS)
        assert banc.PIVOT_VIA == local_server.PIVOT_VIA

    def test_le_plafond_de_phrases_ne_derive_pas(self, local_server):
        champ = local_server.BatchTranslateRequest.model_fields["texts"]
        maxi = next(
            m.max_length for m in champ.metadata if getattr(m, "max_length", None) is not None
        )
        assert banc.PLAFOND_PHRASES_API == maxi

    def test_le_plafond_de_texte_tts_ne_derive_pas(self, local_server):
        champ = local_server.TTSRequest.model_fields["text"]
        maxi = next(
            m.max_length for m in champ.metadata if getattr(m, "max_length", None) is not None
        )
        assert banc.PLAFOND_TEXTE_TTS == maxi

    def test_les_langues_des_deux_api_ne_derivent_pas(self, local_server):
        def langues(modele, champ):
            motif = next(
                m.pattern for m in modele.model_fields[champ].metadata
                if getattr(m, "pattern", None)
            )
            return set(motif.strip("^$()").split("|"))

        assert banc.LANGUES_TRADUCTION_API == langues(
            local_server.BatchTranslateRequest, "target_lang"
        )
        assert banc.LANGUES_SYNTHESE_API == langues(local_server.TTSRequest, "language")
        # Les deux ensembles DIFFÈRENT — c'est le fait que le rapport doit dire.
        assert banc.LANGUES_SYNTHESE_API != banc.LANGUES_TRADUCTION_API
        assert "nl" in banc.LANGUES_SYNTHESE_API
        assert "nl" not in banc.LANGUES_TRADUCTION_API


# ── Garde d'entrée ──────────────────────────────────────────────────────────


class TestGarde:
    def test_accepte_un_service_sous_contrat_au_repos(self):
        banc.verifier_garde({"tts_mode": "azure", "inflight_jobs": 0, "cache_size": 0})

    def test_refuse_le_mode_degrade_en_nommant_la_cause(self):
        with pytest.raises(banc.BancRefuse) as exc:
            banc.verifier_garde({"tts_mode": "edge", "inflight_jobs": 0, "cache_size": 0})
        assert "edge" in str(exc.value)
        assert "azure" in str(exc.value)

    def test_refuse_un_fournisseur_indisponible(self):
        with pytest.raises(banc.BancRefuse):
            banc.verifier_garde(
                {"tts_mode": "indisponible: clé absente", "inflight_jobs": 0, "cache_size": 0}
            )

    def test_refuse_un_service_qui_a_des_jobs_en_vol(self):
        with pytest.raises(banc.BancRefuse) as exc:
            banc.verifier_garde({"tts_mode": "azure", "inflight_jobs": 3, "cache_size": 0})
        assert "file" in str(exc.value)

    def test_refuse_un_cache_de_traduction_non_neutralise(self):
        with pytest.raises(banc.BancRefuse) as exc:
            banc.verifier_garde({"tts_mode": "azure", "inflight_jobs": 0, "cache_size": 12})
        assert "TRANSLATION_CACHE_MAX=0" in str(exc.value)

    @pytest.mark.parametrize("manquante", banc.CLES_SANTE_REQUISES)
    def test_refuse_une_sante_qui_n_expose_pas_les_cles(self, manquante):
        # Un service muet passait la garde grâce aux valeurs par défaut, et le
        # rapport imprimait « 0 (mesuré) » pour un champ jamais rendu.
        sante = {"tts_mode": "azure", "inflight_jobs": 0, "cache_size": 0}
        del sante[manquante]
        with pytest.raises(banc.BancRefuse) as exc:
            banc.verifier_garde(sante)
        assert manquante in str(exc.value)


class TestDiagnostic:
    """`loadtest.submit` et `loadtest.poll` avalent le statut HTTP. Sans ce
    diagnostic, un 401 instantané était consigné « sondage expiré au-delà de
    300 s » et une clé absente passait pour de la contre-pression."""

    @pytest.mark.parametrize(
        "statuts, epuises, attendu",
        [
            ([202, 401], 0, "401"),
            ([422], 0, "422"),
            ([202, 404], 0, "404"),
            ([503], 0, "503"),
            ([429, 429], 1, "contre-pression épuisée"),
            ([202, 200, 200], 0, "sondage expiré"),
            ([], 0, "sans réponse observée"),
        ],
    )
    def test_nomme_la_cause_reelle(self, statuts, epuises, attendu):
        assert attendu in banc.diagnostiquer(statuts, epuises, 300)


# ── Résumé d'un poste ───────────────────────────────────────────────────────


class TestResumePoste:
    def test_percentiles_et_normalisation_par_caractere(self):
        mesures = [banc.Mesure(cle=str(i), chars=1000, duree_s=float(i)) for i in (1, 2, 3, 4)]
        resume = banc.resume_poste(mesures, "caractères source")
        assert resume["p50_s"]["valeur"] == pytest.approx(2.5)
        assert resume["max_s"]["valeur"] == pytest.approx(4.0)
        # 10 s pour 4 000 caractères → 2,5 ms par caractère.
        assert resume["ms_par_caractere"]["valeur"] == pytest.approx(2.5)
        assert resume["taux_aboutissement"]["valeur"] == 100.0

    def test_normalise_sur_les_caracteres_FACTURES_quand_ils_existent(self):
        # Les deux coïncident sur les langues latines, et divergent dès qu'un
        # idéogramme entre au corpus : Azure les compte double.
        mesures = [banc.Mesure(cle="a", chars=1000, chars_factures=2000, duree_s=2.0)]
        resume = banc.resume_poste(mesures, "caractères facturés")
        assert resume["chars_total"]["valeur"] == 2000
        assert resume["ms_par_caractere"]["valeur"] == pytest.approx(1.0)

    def test_ne_pose_pas_de_chiffre_pour_une_division_qui_n_a_pas_eu_lieu(self):
        mesures = [banc.Mesure(cle="a", chars=0, duree_s=2.0)]
        resume = banc.resume_poste(mesures, "caractères source")
        assert "ms_par_caractere" not in resume

    def test_le_facteur_temps_reel_remonte(self):
        # 60 s d'audio produites en 4 s : le chiffre le plus décisionnel de
        # l'exercice, et il restait enfoui dans le détail.
        mesures = [banc.Mesure(cle="a", chars=1000, duree_s=4.0, duree_audio_ms=60000)]
        resume = banc.resume_poste(mesures, "caractères facturés")
        assert resume["facteur_temps_reel"]["valeur"] == pytest.approx(15.0)
        assert resume["audio_total_ms"]["valeur"] == 60000

    def test_un_echantillon_unique_n_est_pas_une_distribution(self):
        resume = banc.resume_poste([banc.Mesure(cle="a", chars=10, duree_s=1.0)], "x")
        assert "n = 1" in resume["reserve_echantillon"]
        assert resume["p50_s"]["valeur"] == resume["max_s"]["valeur"]

    def test_neuf_echantillons_portent_leur_reserve(self):
        mesures = [banc.Mesure(cle=str(i), chars=10, duree_s=float(i)) for i in range(9)]
        resume = banc.resume_poste(mesures, "x")
        assert "LONGUEUR" in resume["reserve_echantillon"]

    def test_un_plafond_atteint_n_est_pas_une_panne(self):
        mesures = [
            banc.Mesure(cle="a", chars=100, duree_s=1.0),
            banc.Mesure(cle="b", chars=99999, issue=banc.LIMITE, motif="plafond"),
        ]
        resume = banc.resume_poste(mesures, "caractères facturés")
        assert resume["n_limites"]["valeur"] == 1
        assert resume["n_echecs"]["valeur"] == 0
        assert resume["taux_aboutissement"]["valeur"] == 100.0


class TestPlafondsDeSynthese:
    def _sans_appel(self, texte: str, langue: str = "de"):
        appels: list[httpx.Request] = []

        def transport(requete: httpx.Request) -> httpx.Response:
            appels.append(requete)
            return httpx.Response(500)

        async def scenario():
            async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
                return await banc.mesurer_synthese(
                    client, "http://banc.invalide", {}, "scene", texte, langue,
                    banc.Stats(), banc.Journal(),
                )

        return asyncio.run(scenario()), appels

    def test_une_scene_au_dessus_du_plafond_facturable_n_est_pas_soumise(self):
        mesure, appels = self._sans_appel("A" * (banc.MAX_BILLABLE_CHARS + 500))
        assert mesure.issue == banc.LIMITE
        assert str(banc.MAX_BILLABLE_CHARS) in mesure.motif
        assert appels == []  # rien n'a été dépensé

    def test_un_texte_traduit_absent_est_une_limite_pas_une_panne(self):
        # Un `sceneId` manquant dans le corpus traduit envoyait `{"text": ""}`,
        # que `TTSRequest(min_length=1)` refuse en 422 — consigné comme un échec
        # du fournisseur alors que c'est un trou dans le corpus.
        mesure, appels = self._sans_appel("   ")
        assert mesure.issue == banc.LIMITE
        assert "absent" in mesure.motif
        assert appels == []

    def test_le_plafond_de_texte_brut_est_distinct_du_plafond_facturable(self):
        # 10 001 caractères bruts, mais moins de 9 000 facturés serait
        # impossible ici : c'est bien la borne d'API qui doit se déclencher
        # d'abord sur un texte sans balisage.
        assert banc.PLAFOND_TEXTE_TTS > banc.MAX_BILLABLE_CHARS


class TestCaracteresFactures:
    def test_un_fournisseur_non_facturant_ne_publie_pas_un_cout_azure(self):
        # `local_server.py:357` rend 0 dès que le fournisseur n'est pas `azure`.
        # Un `or` y substituait l'estimation locale et publiait un coût Azure
        # pour une série qui n'a rien coûté.
        def transport(requete: httpx.Request) -> httpx.Response:
            if requete.url.path == "/v1/tts/generate":
                return httpx.Response(202, json={"ok": True, "job_id": "t1"})
            return httpx.Response(200, json={
                "ok": True, "status": "completed", "audio_base64": "AA",
                "duration_ms": 1000, "billed_characters": 0,
            })

        async def scenario():
            async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
                return await banc.mesurer_synthese(
                    client, "http://banc.invalide", {}, "s", "Bonjour le monde.", "de",
                    banc.Stats(), banc.Journal(),
                )

        mesure = asyncio.run(scenario())
        assert mesure.chars_factures == 0


# ── Microservice de papier ──────────────────────────────────────────────────


SANTE_SOUS_CONTRAT = {
    "status": "ok", "tts": True, "tts_mode": "azure", "translation": True,
    "silence_detection": True, "inflight_jobs": 0, "cache_size": 0,
}


def _microservice_double(
    sante: dict,
    journal: list[tuple[str, str, dict]],
    *,
    sante_apres: dict | None = None,
    echec_traduction: bool = False,
    statut_soumission: int | None = None,
    n_429: int = 0,
):
    """Un microservice de papier : il répond le contrat 202/job_id/sondage et
    NOTE tout ce qu'on lui demande. Ses avaries sont réglables, pour que les
    lignes qui décident d'un échec soient PARCOURUES et non simulées."""
    etat = {"sante": sante, "restant_429": n_429}

    def transport(requete: httpx.Request) -> httpx.Response:
        chemin = requete.url.path
        corps = json.loads(requete.content) if requete.content else {}
        journal.append((requete.method, chemin, corps))
        if chemin == "/health":
            courante = etat["sante"]
            if sante_apres is not None:
                etat["sante"] = sante_apres
            return httpx.Response(200, json=courante)
        if chemin in ("/v1/translate/batch", "/v1/tts/generate"):
            if etat["restant_429"] > 0:
                etat["restant_429"] -= 1
                return httpx.Response(
                    429, json={"ok": False, "error": "busy"}, headers={"Retry-After": "0"},
                )
            if statut_soumission is not None:
                return httpx.Response(statut_soumission, json={"ok": False, "error": "avarie"})
            prefixe = "trad" if chemin.endswith("batch") else "tts"
            return httpx.Response(202, json={"ok": True, "job_id": f"{prefixe}-1"})
        if chemin.startswith("/v1/jobs/trad-"):
            if echec_traduction:
                return httpx.Response(
                    200, json={"ok": False, "status": "failed", "error": "modèle indisponible"}
                )
            return httpx.Response(200, json={"ok": True, "status": "completed", "translations": ["ok"]})
        if chemin.startswith("/v1/jobs/tts-"):
            return httpx.Response(
                200,
                json={
                    "ok": True, "status": "completed", "audio_base64": "AAAA",
                    "duration_ms": 60000, "provider": "azure", "voice": "de-DE-ConradNeural",
                    "tier": "standard", "billed_characters": 1234,
                },
            )
        return httpx.Response(404, json={"ok": False, "error": "route inconnue du banc"})

    return httpx.MockTransport(transport)


def _serie(args, cibles, sante: dict, journal: list, **avaries):
    async def scenario():
        transport = _microservice_double(sante, journal, **avaries)
        async with httpx.AsyncClient(transport=transport) as client:
            return await banc.executer_series(args, cibles, client=client)

    return asyncio.run(scenario())


def _rapport_depuis_serie(corpus, corpus_traduit, tmp_path, sante=None, **avaries):
    args = _args(corpus, corpus_traduit, tmp_path, *avaries.pop("extra", ()))
    cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
    stats = banc.statistiques_corpus(banc.charger_corpus(corpus))
    resultat = _serie(args, cibles, sante or SANTE_SOUS_CONTRAT, [], **avaries)
    return banc.construire_rapport(args, cibles, stats, resultat), resultat


# ── Série ───────────────────────────────────────────────────────────────────


class TestSerie:
    def test_la_serie_produit_deux_postes_separes(self, corpus, corpus_traduit, tmp_path):
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        postes = rapport["postes_mesures"]
        assert set(postes["traduction"]["paires_directes"]) == {"fr→de", "fr→en", "fr→es"}
        assert set(postes["traduction"]["paires_pivotees"]) == {"fr→it"}
        for bloc in postes["traduction"]["paires_directes"].values():
            for cle in ("p50_s", "p95_s", "max_s", "ms_par_caractere"):
                assert cle in bloc["visite_mediane"]
        for cle in ("p50_s", "p95_s", "max_s", "ms_par_caractere"):
            assert cle in postes["synthese"]["visite_mediane"]

    def test_la_visite_mediane_et_la_scene_hors_norme_ne_se_melangent_pas(
        self, corpus, corpus_traduit, tmp_path
    ):
        # Les mélanger faisait passer la Scène de 7 308 caractères pour la queue
        # de distribution d'une Visite ordinaire.
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        bloc = rapport["postes_mesures"]["traduction"]["paires_directes"]["fr→de"]
        assert bloc["visite_mediane"]["n_abouties"]["valeur"] == 8
        assert bloc["scene_hors_norme"]["n_abouties"]["valeur"] == 1
        assert bloc["visite_mediane"]["chars_total"]["valeur"] == 8968

    def test_le_demarrage_a_froid_sort_des_percentiles(self, corpus, corpus_traduit, tmp_path):
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        froid = rapport["postes_mesures"]["demarrage_a_froid"]["paires"]
        assert [p["paire"] for p in froid] == ["fr→de", "fr→en", "fr→es", "fr→it"]
        assert all(p["exclu_des_percentiles"] for p in froid)
        for bloc in rapport["postes_mesures"]["traduction"]["paires_directes"].values():
            assert bloc["visite_mediane"]["n_abouties"]["valeur"] == 8

    def test_un_amorcage_jete_precede_la_boucle(self, corpus, corpus_traduit, tmp_path):
        # Sans lui, la première paire de la boucle payait l'éveil du processus
        # et sortait du lot d'un facteur trois ou quatre, qu'on lisait à tort
        # comme le prix de son modèle.
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        amorcage = rapport["postes_mesures"]["amorcage"]
        assert amorcage["ecarte"] is True
        assert amorcage["paire"] == "fr→de"
        froid = {p["paire"]: p for p in rapport["postes_mesures"]["demarrage_a_froid"]["paires"]}
        # La paire amorcée n'a plus de modèle à charger : l'amorçage l'a payé.
        assert froid["fr→de"]["modeles_charges_par_cet_appel"] == []

    def test_la_paire_pivotee_declare_ses_deux_modeles(self, corpus, corpus_traduit, tmp_path):
        _, resultat = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        froid = {p["paire"]: p for p in resultat.froid}
        assert froid["fr→it"]["pivot"] == "en"
        assert froid["fr→it"]["modeles_requis"] == ["fr-en", "en-it"]
        assert froid["fr→it"]["modeles_charges_par_cet_appel"] == ["en-it"]

    def test_les_routes_sont_observees_et_non_declarees(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        journal: list = []
        resultat = _serie(args, cibles, SANTE_SOUS_CONTRAT, journal)
        observees = {
            banc.Journal.route(m, p) for m, p, _ in journal
        }
        assert resultat.routes_appelees == observees
        assert resultat.routes_appelees == {
            "GET /health", "POST /v1/translate/batch", "POST /v1/tts/generate", "GET /v1/jobs/{id}",
        }

    def test_le_mode_degrade_arrete_le_banc_avant_toute_depense(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        journal: list = []
        degrade = {**SANTE_SOUS_CONTRAT, "tts_mode": "edge"}
        with pytest.raises(banc.BancRefuse) as exc:
            _serie(args, cibles, degrade, journal)
        assert "edge" in str(exc.value)
        assert [p for _, p, _ in journal] == ["/health"]

    def test_une_langue_de_synthese_hors_perimetre_arrete_avant_depense(
        self, corpus, corpus_traduit, tmp_path
    ):
        args = _args(corpus, corpus_traduit, tmp_path, "--langue-synthese", "en",
                     "--langues", "de,es")
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        journal: list = []
        with pytest.raises(banc.BancRefuse) as exc:
            _serie(args, cibles, SANTE_SOUS_CONTRAT, journal)
        assert "--langue-synthese" in str(exc.value)
        assert journal == []  # pas même la sonde de santé

    def test_un_corpus_traduit_incomplet_arrete_avant_la_traduction(
        self, corpus, corpus_traduit, tmp_path
    ):
        # Résolu tardivement, ce trou faisait perdre TOUTE la série de
        # traduction — donc de la dépense — avant d'être découvert.
        (corpus_traduit / f"{banc.ID_VISITE_HORS_NORME}.json").unlink()
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        journal: list = []
        with pytest.raises(banc.ErreurCorpus):
            _serie(args, cibles, SANTE_SOUS_CONTRAT, journal)
        assert [p for _, p, _ in journal] == ["/health"]


class TestEchecsParcourus:
    """Le chemin d'échec est PARCOURU. Fabriquer soi-même un `Mesure(ECHEC)`
    n'éprouve rien des lignes qui décident qu'une mesure a échoué."""

    def test_un_job_en_echec_est_consigne_et_la_serie_continue(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, resultat = _rapport_depuis_serie(
            corpus, corpus_traduit, tmp_path, echec_traduction=True
        )
        bloc = rapport["postes_mesures"]["traduction"]["paires_directes"]["fr→de"]["visite_mediane"]
        assert bloc["n_abouties"]["valeur"] == 0
        assert bloc["n_echecs"]["valeur"] == 8
        assert bloc["taux_aboutissement"]["valeur"] == 0.0
        # Aucun percentile ne se calcule sur des échecs.
        assert "p50_s" not in bloc
        assert any("modèle indisponible" in m for m in bloc["motifs_d_echec"])
        # La série a continué : la synthèse, elle, a bien tourné.
        assert rapport["postes_mesures"]["synthese"]["visite_mediane"]["n_abouties"]["valeur"] == 8

    def test_un_5xx_est_nomme_comme_tel_et_invalide_la_serie(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, resultat = _rapport_depuis_serie(
            corpus, corpus_traduit, tmp_path, statut_soumission=503
        )
        assert resultat.c5xx > 0
        assert resultat.serie_valide is False
        assert any("5xx" in r for r in resultat.reserve)
        bloc = rapport["postes_mesures"]["traduction"]["paires_directes"]["fr→de"]["visite_mediane"]
        assert bloc["n_echecs"]["valeur"] == 8
        # Le motif nomme le statut réel, pas une expiration de sondage.
        assert any("503" in m for m in bloc["motifs_d_echec"])

    def test_une_authentification_refusee_ne_passe_pas_pour_de_la_contre_pression(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, _ = _rapport_depuis_serie(
            corpus, corpus_traduit, tmp_path, statut_soumission=401
        )
        bloc = rapport["postes_mesures"]["traduction"]["paires_directes"]["fr→de"]["visite_mediane"]
        assert any("401" in m for m in bloc["motifs_d_echec"])
        assert not any("contre-pression" in m for m in bloc["motifs_d_echec"])


class TestSerieNonValide:
    """Le mécanisme entier, parcouru : la garde assumée, la réserve, le bandeau
    du markdown, et le code de sortie."""

    def test_un_cache_assume_invalide_la_serie_de_bout_en_bout(
        self, corpus, corpus_traduit, tmp_path
    ):
        sante = {**SANTE_SOUS_CONTRAT, "cache_size": 5}
        apres = {**SANTE_SOUS_CONTRAT, "cache_size": 8}
        args = _args(corpus, corpus_traduit, tmp_path, "--cache-non-neutralise")
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        resultat = _serie(args, cibles, sante, [], sante_apres=apres)
        assert resultat.serie_valide is False
        assert resultat.reserve
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), resultat
        )
        assert rapport["postes_mesures"]["serie_valide"] is False
        texte = banc.rendre_markdown(rapport)
        assert "SÉRIE DÉCLARÉE NON VALIDE" in texte

    def test_les_succes_de_cache_sont_detectes_par_le_delta(
        self, corpus, corpus_traduit, tmp_path
    ):
        # La garde ne regarde `cache_size` qu'à t0 : un simple redémarrage la
        # satisfait sans que le cache soit neutralisé. Le delta, lui, le dit.
        apres = {**SANTE_SOUS_CONTRAT, "cache_size": 3}
        rapport, resultat = _rapport_depuis_serie(
            corpus, corpus_traduit, tmp_path, sante_apres=apres
        )
        provenance = rapport["postes_mesures"]["provenance_du_cache"]
        assert provenance["etat"] == "succès de cache détectés"
        assert provenance["serie_valide"] is False
        assert resultat.serie_valide is False
        assert provenance["phrases_distinctes_soumises"]["valeur"] > 3

    def test_un_cache_neutralise_ne_declenche_aucune_reserve(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, resultat = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        assert rapport["postes_mesures"]["provenance_du_cache"]["etat"] == "neutralisé"
        assert resultat.serie_valide is True

    def test_une_contre_pression_invalide_la_serie(self, corpus, corpus_traduit, tmp_path):
        _, resultat = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path, n_429=2)
        assert resultat.c429 == 2
        assert resultat.serie_valide is False
        assert any("429" in r for r in resultat.reserve)


# ── Codes de sortie ─────────────────────────────────────────────────────────


def _brancher_client(monkeypatch, transport_factory):
    vraie_classe = httpx.AsyncClient

    def client_double(*_args, **_kwargs):
        return vraie_classe(transport=transport_factory())

    monkeypatch.setattr(banc.httpx, "AsyncClient", client_double)


class TestCodeDeSortie:
    def _cli(self, corpus, corpus_traduit, tmp_path, *extra):
        return [
            "--corpus", str(corpus), "--corpus-traduit", str(corpus_traduit),
            "--sortie", str(tmp_path / "mesures"), "--base", "http://banc.invalide", *extra,
        ]

    def test_le_mode_degrade_rend_un_code_non_nul(self, corpus, corpus_traduit, tmp_path, monkeypatch):
        degrade = {**SANTE_SOUS_CONTRAT, "tts_mode": "edge"}
        _brancher_client(monkeypatch, lambda: _microservice_double(degrade, []))
        code = banc.main(self._cli(corpus, corpus_traduit, tmp_path))
        assert code == 2
        assert not (tmp_path / "mesures").exists()  # aucun rapport trompeur

    def test_le_microservice_injoignable_ne_produit_pas_un_rapport_vide(
        self, corpus, corpus_traduit, tmp_path, monkeypatch
    ):
        def transport(_requete: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("connexion refusée")

        _brancher_client(monkeypatch, lambda: httpx.MockTransport(transport))
        code = banc.main(self._cli(corpus, corpus_traduit, tmp_path))
        assert code == 2
        assert not (tmp_path / "mesures").exists()

    def test_une_serie_saine_rend_zero_et_depose_deux_fichiers(
        self, corpus, corpus_traduit, tmp_path, monkeypatch
    ):
        _brancher_client(monkeypatch, lambda: _microservice_double(SANTE_SOUS_CONTRAT, []))
        code = banc.main(self._cli(corpus, corpus_traduit, tmp_path))
        assert code == 0
        deposes = sorted((tmp_path / "mesures").iterdir())
        assert len(deposes) == 2
        assert {c.suffix for c in deposes} == {".json", ".md"}

    def test_une_serie_non_valide_rend_un_et_depose_quand_meme(
        self, corpus, corpus_traduit, tmp_path, monkeypatch
    ):
        sante = {**SANTE_SOUS_CONTRAT, "cache_size": 5}
        apres = {**SANTE_SOUS_CONTRAT, "cache_size": 8}
        _brancher_client(monkeypatch, lambda: _microservice_double(sante, [], sante_apres=apres))
        code = banc.main(self._cli(corpus, corpus_traduit, tmp_path, "--cache-non-neutralise"))
        # La mesure existe et se lit — mais le code de sortie dit qu'on ne peut
        # pas s'y fier.
        assert code == 1
        assert len(list((tmp_path / "mesures").iterdir())) == 2

    def test_sans_serie_rend_zero_et_depose_le_rapport_des_constats(
        self, corpus, corpus_traduit, tmp_path
    ):
        code = banc.main(self._cli(corpus, corpus_traduit, tmp_path, "--sans-serie"))
        assert code == 0
        md = next((tmp_path / "mesures").glob("*.md"))
        assert "NON MESURÉS" in md.read_text(encoding="utf-8")

    def test_le_dry_run_resout_les_cibles_sans_aucun_appel(self, corpus, corpus_traduit, tmp_path, capsys):
        code = banc.main(self._cli(corpus, corpus_traduit, tmp_path, "--dry-run"))
        assert code == 0
        sortie = capsys.readouterr().out
        assert banc.ID_VISITE_MEDIANE in sortie
        assert banc.ID_VISITE_HORS_NORME in sortie
        assert "Aucun appel fournisseur n'a été émis." in sortie
        assert not (tmp_path / "mesures").exists()


class TestDepot:
    def test_le_banc_n_ecrase_jamais_une_mesure(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), None
        )
        dossier = tmp_path / "mesures"
        banc.deposer_rapport(rapport, dossier)
        # Deux exécutions dans la même minute : la seconde ne doit pas effacer
        # la première dans un dossier dont la raison d'être est de survivre.
        with pytest.raises(banc.BancRefuse) as exc:
            banc.deposer_rapport(rapport, dossier)
        assert "n'écrase pas" in str(exc.value)


# ── Ancrages ────────────────────────────────────────────────────────────────


class TestAnchors:
    def test_un_numero_de_ligne_hors_bornes_n_est_jamais_verifie(self, tmp_path, monkeypatch):
        # Un numéro de 0 indexait -1 : la DERNIÈRE ligne du fichier était
        # déclarée « vérifiée » pour un anchor qui ne pointe nulle part.
        fichier = tmp_path / "cible.ts"
        fichier.write_text("premiere\ndeuxieme\nJETON\n", encoding="utf-8")
        monkeypatch.setattr(banc, "RACINE_DEPOT", tmp_path)
        assert banc.verifier_anchor("cible.ts:3", "JETON") is True
        assert banc.verifier_anchor("cible.ts:0", "JETON") is False
        assert banc.verifier_anchor("cible.ts:99", "JETON") is False
        assert banc.verifier_anchor("cible.ts:-1", "JETON") is False
        assert banc.verifier_anchor("absent.ts:1", "JETON") is False
        assert banc.verifier_anchor("cible.ts:pasunnombre", "JETON") is False
        assert banc.verifier_anchor("cible.ts:1", "JETON") is False

    @pytest.mark.skipif(
        not (banc.RACINE_DEPOT / "TourGuideWeb" / "src" / "lib" / "stores" / "tts-store.ts").is_file(),
        reason="dépôt complet absent du poste",
    )
    def test_les_anchors_pointent_encore_sur_ce_qu_ils_annoncent(self):
        for poste in banc.POSTES_CONSTATES:
            assert banc.verifier_anchor(poste["anchor"], poste["jeton"]), (
                f"anchor périmé : {poste['anchor']} ne porte plus {poste['jeton']!r}"
            )


class TestLectureSeule:
    def test_aucun_sdk_aws_n_est_charge_par_le_banc(self):
        # N'inspecter que les imports directs laissait passer un SDK tiré par
        # `loadtest` ou par `services.*`. On regarde ce qui est RÉELLEMENT
        # chargé une fois le banc importé.
        interdits = {"boto3", "botocore", "aiobotocore", "aws_cdk", "s3transfer"}
        charges = {nom.split(".")[0] for nom in sys.modules}
        assert not (interdits & charges), f"SDK AWS chargé : {interdits & charges}"

    def test_le_banc_n_importe_aucun_client_reseau_hors_httpx(self):
        arbre = ast.parse((RACINE_MICROSERVICE / "bench_fabrication.py").read_text(encoding="utf-8"))
        importes: set[str] = set()
        for noeud in ast.walk(arbre):
            if isinstance(noeud, ast.Import):
                importes.update(alias.name.split(".")[0] for alias in noeud.names)
            elif isinstance(noeud, ast.ImportFrom) and noeud.module:
                importes.add(noeud.module.split(".")[0])
        for interdit in ("boto3", "botocore", "requests", "urllib", "socket"):
            assert interdit not in importes, f"le banc importe {interdit!r}"


# ── Rapport ─────────────────────────────────────────────────────────────────


def _nombres_sans_methode(noeud, chemin="racine") -> list[str]:
    """Traque tout nombre qui ne serait pas enveloppé par `chiffre()`."""
    fautes: list[str] = []
    if isinstance(noeud, dict):
        if "valeur" in noeud and "methode" in noeud:
            if noeud["methode"] not in banc.METHODES:
                fautes.append(f"{chemin}: méthode inconnue {noeud['methode']!r}")
            return fautes
        for cle, valeur in noeud.items():
            fautes.extend(_nombres_sans_methode(valeur, f"{chemin}.{cle}"))
    elif isinstance(noeud, list):
        for i, valeur in enumerate(noeud):
            fautes.extend(_nombres_sans_methode(valeur, f"{chemin}[{i}]"))
    elif isinstance(noeud, bool):
        pass
    elif isinstance(noeud, (int, float)):
        fautes.append(f"{chemin} = {noeud}")
    return fautes


class TestRapport:
    def test_aucun_chiffre_n_entre_sans_sa_methode(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        stats = banc.statistiques_corpus(banc.charger_corpus(corpus))
        resultat = _serie(args, cibles, SANTE_SOUS_CONTRAT, [])
        for rapport in (
            banc.construire_rapport(args, cibles, stats, None),
            banc.construire_rapport(args, cibles, stats, resultat),
        ):
            relu = json.loads(json.dumps(rapport, ensure_ascii=False))
            assert _nombres_sans_methode(relu) == []

    def test_chiffre_refuse_une_methode_inventee(self):
        with pytest.raises(ValueError):
            banc.chiffre(1, "à peu près")
        with pytest.raises(ValueError):
            banc.chiffre("beaucoup", banc.MESURE)

    def test_le_delai_paiement_premiere_ecoute_est_explique_pas_chiffre(
        self, corpus, corpus_traduit, tmp_path
    ):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), None
        )
        bloc = rapport["ce_que_ce_banc_ne_mesure_pas"]
        assert "paiement" in bloc["delai"]
        assert _nombres_sans_methode(bloc) == []
        assert "FREE_PREVIEW_SCENE_COUNT" in bloc["pourquoi"]

    def test_les_postes_non_mesurables_portent_leur_anchor(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), None
        )
        anchors = {p["anchor"] for p in rapport["postes_constates"]}
        assert "TourGuideWeb/src/lib/stores/tts-store.ts:7" in anchors
        assert "TourGuideWeb/src/lib/api/language-purchase.ts:818" in anchors
        assert (
            "TourGuideApp/amplify/functions/get-published-tour-content/handler.ts:28" in anchors
        )
        for poste in rapport["postes_constates"]:
            if poste["cout"] is None:
                assert poste["cout_texte"], f"{poste['nom']} : ni chiffre ni raison"
            else:
                assert poste["cout"]["methode"] in banc.METHODES
            assert poste["pourquoi_non_mesurable"]

    def test_le_sondage_est_un_plancher_dur_pas_une_esperance(self):
        # `startPolling` arme un `setInterval` SANS appel immédiat : le premier
        # sondage tombe à t+15 s inconditionnellement. L'ancienne rédaction
        # (« 0 à 15 s, espérance 7,5 s ») se trompait dans le sens rassurant.
        poste = next(p for p in banc.POSTES_CONSTATES if "Sondage" in p["nom"])
        assert poste["cout"]["valeur"] == 15.0
        assert "plancher dur" in poste["cout"]["note"]
        assert "espérance" not in poste["levier"]

    def test_une_duree_humaine_n_entre_pas_au_rapport_comme_un_zero(
        self, corpus, corpus_traduit, tmp_path
    ):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), None
        )
        humain = next(
            p for p in rapport["postes_constates"] if "Approbation humaine" in p["nom"]
        )
        assert humain["cout"] is None
        assert "NON BORNÉE" in humain["cout_texte"]

    def test_les_hypotheses_non_mesurees_sont_nommees(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), None
        )
        hypotheses = " ".join(rapport["protocole"]["hypotheses"])
        assert "environnement DU BANC" in hypotheses
        assert str(banc.PLAFOND_TEXTE_TTS) in hypotheses
        assert "2026-08-22" in hypotheses

    def test_le_profil_dit_ce_que_chaque_api_accepte(self, corpus, corpus_traduit, tmp_path):
        args = _args(corpus, corpus_traduit, tmp_path)
        cibles = banc.selectionner_cibles(banc.charger_corpus(corpus))
        rapport = banc.construire_rapport(
            args, cibles, banc.statistiques_corpus(banc.charger_corpus(corpus)), None
        )
        profil = rapport["profil_par_langue"]
        assert profil["langues"]["fr"]["traduisible_par_le_microservice"] is True
        assert "idéogrammes" in profil["note_langues"]
        # Le français est une entrée comme les autres, pas une cellule calculée
        # au rendu qui échappait au contrôle des méthodes.
        assert profil["langues"]["fr"]["cout_visite_mediane"]["methode"] == banc.ESTIME


class TestRenduMesure:
    """La branche MESURÉE du rendu ne tournait, jusqu'ici, que pendant une série
    payante : un renommage dans `construire_rapport` aurait levé un `KeyError`
    après la dépense."""

    @pytest.fixture
    def texte(self, corpus, corpus_traduit, tmp_path):
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        return banc.rendre_markdown(rapport)

    def test_le_markdown_d_une_serie_se_rend_entierement(self, texte):
        for attendu in (
            "## Conclusion — le plancher face aux cibles du SPEC",
            "## Agrégat — ce que coûte une Visite entière",
            "### Démarrage à froid",
            "### Poste 1 — Traduction",
            "### Poste 2 — Synthèse",
            "**Détail par Scène**",
            "Cache de traduction",
            "Amorçage écarté",
        ):
            assert attendu in texte, attendu

    def test_le_facteur_temps_reel_est_rendu(self, texte):
        assert "facteur temps reel" in texte

    def test_les_notes_remontent_au_markdown(self, texte):
        # Le JSON portait seul les `note` : le markdown, seul livrable lu,
        # n'en rendait aucune.
        assert "somme des durées / somme des caractères" in texte
        assert "n'est pas le p50 de la somme" in texte

    def test_le_detail_par_scene_permet_d_identifier_une_scene_lente(self, texte):
        assert "| Scène | Caractères | Durée |" in texte

    def test_chaque_valeur_rendue_porte_sa_methode(self, texte):
        for methode in banc.METHODES:
            assert f"*({methode})*" in texte

    def test_un_taux_entier_ne_feint_pas_deux_decimales(self, texte):
        assert "100,00 %" not in texte
        assert "100 %" in texte


class TestConclusionEtAgregat:
    def test_la_conclusion_tranche_contre_les_cibles_du_spec(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        conclusion = rapport["conclusion"]
        assert conclusion["paire_chainee"] == "fr→de"
        assert conclusion["cibles_du_spec"]["p50_s"]["valeur"] == 30.0
        premiere = conclusion["premiere_scene_mesuree"]
        # La chaîne réelle : deux mesures prises sur la MÊME Scène #0.
        assert premiere["total_s"]["valeur"] == pytest.approx(
            premiere["traduction_s"]["valeur"] + premiere["synthese_s"]["valeur"], abs=0.02
        )
        assert premiere["verdict_p50"] in ("tient", "tient de justesse", "ne tient pas")
        # Le sondage à 15 s s'ajoute et peut faire basculer le verdict.
        assert premiere["avec_le_sondage_a_15_s"]["valeur"] == pytest.approx(
            premiere["total_s"]["valeur"] + 15.0, abs=0.01
        )

    def test_l_enveloppe_dit_qu_une_somme_de_percentiles_n_en_est_pas_un(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        enveloppe = rapport["conclusion"]["enveloppe_p95"]
        assert enveloppe["total_s"]["methode"] == banc.ESTIME
        assert "pas le p95 de la somme" in enveloppe["total_s"]["note"]
        assert enveloppe["cible_s"]["valeur"] == 60.0

    @pytest.mark.parametrize(
        "valeur, cible, attendu",
        [(10.0, 30.0, "tient"), (25.0, 30.0, "tient de justesse"), (31.0, 30.0, "ne tient pas")],
    )
    def test_le_verdict_a_trois_etats(self, valeur, cible, attendu):
        assert banc._verdict(valeur, cible) == attendu

    def test_l_agregat_somme_ce_que_les_tables_ne_somment_pas(
        self, corpus, corpus_traduit, tmp_path
    ):
        rapport, _ = _rapport_depuis_serie(corpus, corpus_traduit, tmp_path)
        agregat = rapport["agregat_une_visite"]
        assert set(agregat["traduction_par_paire"]) == {"fr→de", "fr→en", "fr→es", "fr→it"}
        somme = sum(v["valeur"] for v in agregat["traduction_par_paire"].values())
        assert agregat["traduction_total_s"]["valeur"] == pytest.approx(somme, abs=0.05)
        # La langue mesurée reste mesurée ; les autres sont mises à l'échelle.
        assert agregat["synthese_par_langue"]["de"]["methode"] == banc.MESURE
        assert agregat["total_s"]["methode"] == banc.ESTIME
        assert agregat["total_min"]["valeur"] == pytest.approx(
            agregat["total_s"]["valeur"] / 60.0, abs=0.02
        )

    def test_la_conclusion_se_declare_indisponible_plutot_que_d_inventer(self):
        vide = banc.Resultat(langue_synthese="de", langues=["de"])
        assert banc.construire_conclusion(vide)["etat"] == "indisponible"
