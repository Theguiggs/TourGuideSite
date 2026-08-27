"""
La frontière du Fournisseur de synthèse — les neuf lignes de la matrice.

Aucune clé, aucun réseau, pas un centime dépensé : le fournisseur sous contrat
est joué par une doublure qui note ce qu'on lui demande. Ce qui est éprouvé ici
n'est pas Azure — c'est NOTRE contrat avec lui : un seul appel par Scène, le
SSML transmis tel quel, le mode dégradé nommé quand il sert, et les erreurs
d'authentification distinguées des pannes.
"""

from __future__ import annotations

import asyncio

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.tts_provider import (  # noqa: E402
    VOICES_HD,
    VOICES_STANDARD,
    ProviderAuthError,
    ProviderError,
    ProviderQuotaError,
    billed_characters,
    build_provider,
    resolve_tier,
    resolve_voice,
)


@pytest.fixture(autouse=True)
def environnement_propre(monkeypatch):
    """Aucune variable héritée du poste : un test qui dépend de la machine qui
    l'exécute ne prouve rien."""
    for nom in ("TTS_PROVIDER", "AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "TTS_VOICE_TIER"):
        monkeypatch.delenv(nom, raising=False)


# ── Comptage facturé ───────────────────────────────────────────────────────

class TestCaracteresFactures:
    def test_exclut_l_enveloppe_speak_et_voice(self):
        # Azure facture le balisage SAUF `<speak>` et `<voice>`. Compter
        # l'enveloppe surestimerait chaque Scène d'une centaine de caractères.
        nu = "Bonjour."
        enveloppe = (
            '<speak version="1.0" xml:lang="fr-FR">'
            '<voice name="fr-FR-HenriNeural">Bonjour.</voice></speak>'
        )
        assert billed_characters(enveloppe) == billed_characters(nu) == len(nu)

    def test_compte_le_balisage_interieur(self):
        # `<break>` EST facturé : le corpus n'en porte que 90, mais les compter
        # à zéro ferait diverger le total du jour où il y en aurait mille.
        avec = 'Arrête-toi.<break time="4s"/>Regarde.'
        assert billed_characters(avec) == len(avec)

    def test_compte_les_ideogrammes_double(self):
        # Sans effet aujourd'hui, décisif à l'ouverture du japonais ou du chinois.
        assert billed_characters("ab") == 2
        assert billed_characters("日本") == 4
        assert billed_characters("a日") == 3

    @pytest.mark.parametrize("entree", ["", None])
    def test_tolere_le_vide(self, entree):
        assert billed_characters(entree) == 0


# ── Palier de voix ─────────────────────────────────────────────────────────

class TestPalier:
    def test_standard_par_defaut(self):
        assert resolve_tier() == "standard"

    def test_lit_la_configuration(self, monkeypatch):
        monkeypatch.setenv("TTS_VOICE_TIER", "hd")
        assert resolve_tier() == "hd"

    def test_un_palier_inconnu_retombe_sur_standard_en_le_disant(self, monkeypatch, caplog):
        # Un réglage mal orthographié ne doit pas facturer silencieusement au
        # tarif supérieur — ni se taire.
        monkeypatch.setenv("TTS_VOICE_TIER", "ultra")
        with caplog.at_level("WARNING"):
            assert resolve_tier() == "standard"
        assert "ultra" in caplog.text


class TestVoix:
    @pytest.mark.parametrize("langue,attendue", sorted(VOICES_STANDARD.items()))
    def test_les_voix_du_catalogue_ne_changent_pas(self, langue, attendue):
        # Les cinq voix en vente sont déjà des voix Azure : la bascule change le
        # rendu, jamais l'identité vocale.
        assert resolve_voice(langue, "standard") == attendue

    def test_les_cinq_voix_historiques_sont_intactes(self):
        assert VOICES_STANDARD["fr"] == "fr-FR-HenriNeural"
        assert VOICES_STANDARD["en"] == "en-US-GuyNeural"
        assert VOICES_STANDARD["it"] == "it-IT-DiegoNeural"
        assert VOICES_STANDARD["de"] == "de-DE-ConradNeural"
        assert VOICES_STANDARD["es"] == "es-ES-AlvaroNeural"

    def test_le_palier_hd_change_la_voix(self):
        assert resolve_voice("fr", "hd") == VOICES_HD["fr"]
        assert resolve_voice("fr", "hd") != resolve_voice("fr", "standard")

    def test_une_langue_sans_voix_hd_retombe_sur_sa_voix_standard(self, caplog):
        # Et non sur le français : perdre la LANGUE serait pire que perdre le palier.
        with caplog.at_level("INFO"):
            assert resolve_voice("ja", "hd") == VOICES_STANDARD["ja"]

    def test_une_langue_inconnue_retombe_sur_le_francais_en_le_disant(self, caplog):
        with caplog.at_level("WARNING"):
            assert resolve_voice("pt", "standard") == VOICES_STANDARD["fr"]
        assert "pt" in caplog.text

    def test_une_voix_explicite_l_emporte(self):
        # C'est ce qui rend l'écoute comparative possible sans toucher au code.
        assert resolve_voice("fr", "standard", "fr-FR-DeniseNeural") == "fr-FR-DeniseNeural"


# ── Choix du fournisseur ───────────────────────────────────────────────────

class TestChoixDuFournisseur:
    def test_sans_cle_le_mode_degrade_s_applique_ET_se_declare(self, caplog):
        with caplog.at_level("WARNING"):
            provider = build_provider()
        assert provider.name == "edge"
        # Le SPEC exige que le mode dégradé soit JOURNALISÉ, pas seulement subi.
        assert "DÉGRADÉ" in caplog.text
        assert "AZURE_SPEECH_KEY" in caplog.text

    def test_une_region_sans_cle_reste_degrade(self, monkeypatch, caplog):
        monkeypatch.setenv("AZURE_SPEECH_REGION", "westeurope")
        with caplog.at_level("WARNING"):
            assert build_provider().name == "edge"
        assert "AZURE_SPEECH_KEY" in caplog.text

    def test_une_cle_sans_region_reste_degrade_en_nommant_ce_qui_manque(
        self, monkeypatch, caplog
    ):
        monkeypatch.setenv("AZURE_SPEECH_KEY", "k")
        with caplog.at_level("WARNING"):
            assert build_provider().name == "edge"
        assert "AZURE_SPEECH_REGION" in caplog.text

    def test_cle_et_region_donnent_le_fournisseur_sous_contrat(self, monkeypatch):
        monkeypatch.setenv("AZURE_SPEECH_KEY", "k")
        monkeypatch.setenv("AZURE_SPEECH_REGION", "westeurope")
        assert build_provider().name == "azure"

    def test_le_mode_degrade_explicite_se_declare_aussi(self, monkeypatch, caplog):
        # Même avec une clé valide : demander le gratuit est un choix qui se dit.
        monkeypatch.setenv("AZURE_SPEECH_KEY", "k")
        monkeypatch.setenv("AZURE_SPEECH_REGION", "westeurope")
        monkeypatch.setenv("TTS_PROVIDER", "edge")
        with caplog.at_level("WARNING"):
            assert build_provider().name == "edge"
        assert "DÉGRADÉ" in caplog.text


# ── Le fournisseur sous contrat ────────────────────────────────────────────

class _Reponse:
    def __init__(self, status_code=200, content=b"RIFF....WAVE", text=""):
        self.status_code = status_code
        self.content = content
        self.text = text


@pytest.fixture
def azure(monkeypatch):
    from services.tts_azure import AzureTTSProvider

    return AzureTTSProvider(key="cle-de-test", region="westeurope", timeout_s=1)


def _capture_appels(monkeypatch, *reponses):
    """Remplace Session.post et note ce qu'on lui demande.

    Accepte PLUSIEURS reponses : les reprises consomment la suite, ce qui permet
    d'eprouver « echoue puis reussit » sans toucher au code.
    """
    appels: list[dict] = []
    suite = list(reponses) or [_Reponse()]

    def _post(self, url, data=None, headers=None, timeout=None):
        appels.append({"url": url, "data": data, "headers": headers, "timeout": timeout})
        return suite[min(len(appels) - 1, len(suite) - 1)]

    import requests

    monkeypatch.setattr(requests.Session, "post", _post)
    # Les reprises dorment : sans cela, chaque test d'echec attendrait plusieurs
    # secondes pour ne rien prouver de plus.
    monkeypatch.setattr("services.tts_azure.RETRY_BASE_DELAY_S", 0)
    return appels


class TestFournisseurSousContrat:
    def test_refuse_d_exister_sans_cle(self):
        from services.tts_azure import AzureTTSProvider

        # Ne jamais construire un fournisseur muet : sans clé, c'est la fabrique
        # qui doit choisir le mode dégradé, en le disant.
        with pytest.raises(ProviderAuthError):
            AzureTTSProvider(key="", region="westeurope")
        with pytest.raises(ProviderAuthError):
            AzureTTSProvider(key="k", region="")

    def test_une_scene_avec_pause_part_en_UN_seul_appel(self, azure, monkeypatch):
        # C'est l'objet même de la bascule : le contournement découpait à 2 000
        # caractères et recollait des silences ; ici le SSML part entier.
        appels = _capture_appels(monkeypatch, _Reponse())
        monkeypatch.setattr(
            "pydub.AudioSegment.from_file", lambda *a, **k: _FauxSegment(3000)
        )
        ssml = 'Arrête-toi.<break time="4s"/>Tu es au cœur de Grasse.'

        asyncio.run(azure.synthesize(ssml, "fr-FR-HenriNeural", "standard"))

        assert len(appels) == 1
        envoye = appels[0]["data"].decode("utf-8")
        # Le balisage est transmis TEL QUEL : ni réanalysé, ni réécrit.
        assert '<break time="4s"/>' in envoye
        assert "fr-FR-HenriNeural" in envoye

    def test_la_scene_la_plus_longue_du_corpus_passe_en_un_appel(
        self, azure, monkeypatch
    ):
        # 7 308 caractères : la Scène la plus longue des 101 visites.
        appels = _capture_appels(monkeypatch, _Reponse())
        monkeypatch.setattr(
            "pydub.AudioSegment.from_file", lambda *a, **k: _FauxSegment(480000)
        )

        asyncio.run(azure.synthesize("a" * 7308, "fr-FR-HenriNeural", "standard"))

        assert len(appels) == 1

    def test_un_depassement_dit_ce_qui_depasse(self, azure, monkeypatch):
        monkeypatch.setattr("services.tts_azure.MAX_BILLABLE_CHARS", 100)
        with pytest.raises(ProviderError) as e:
            asyncio.run(azure.synthesize("a" * 500, "fr-FR-HenriNeural", "standard"))
        # « Pas d'audio » n'aide personne à comprendre qu'il faut condenser.
        assert "500" in str(e.value) and "100" in str(e.value)

    @pytest.mark.parametrize("code", [401, 403])
    def test_une_cle_refusee_est_distinguee_d_une_panne(
        self, azure, monkeypatch, code
    ):
        # On ne réessaie pas une clé refusée : la suite à donner n'est pas celle
        # d'une indisponibilité passagère.
        _capture_appels(monkeypatch, _Reponse(status_code=code))
        with pytest.raises(ProviderAuthError) as e:
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))
        assert "AZURE_SPEECH_KEY" in str(e.value)

    def test_une_limitation_de_debit_est_reessayable(self, azure, monkeypatch):
        _capture_appels(monkeypatch, _Reponse(status_code=429))
        with pytest.raises(ProviderQuotaError):
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))

    def test_une_panne_leve_sans_repli_muet(self, azure, monkeypatch):
        # Surtout : elle ne bascule PAS sur le service gratuit. Le job échoue,
        # et le visiteur a un recours (story 13).
        _capture_appels(monkeypatch, _Reponse(status_code=503, text="upstream down"))
        with pytest.raises(ProviderError) as e:
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))
        assert not isinstance(e.value, ProviderAuthError)
        assert "503" in str(e.value)

    def test_une_reponse_sans_audio_leve(self, azure, monkeypatch):
        _capture_appels(monkeypatch, _Reponse(content=b""))
        with pytest.raises(ProviderError):
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))

    def test_un_ssml_deja_enveloppe_n_est_pas_reenveloppe(self, azure, monkeypatch):
        appels = _capture_appels(monkeypatch, _Reponse())
        monkeypatch.setattr(
            "pydub.AudioSegment.from_file", lambda *a, **k: _FauxSegment(1000)
        )
        deja = '<speak version="1.0"><voice name="fr-FR-HenriNeural">Salut.</voice></speak>'

        asyncio.run(azure.synthesize(deja, "fr-FR-HenriNeural", "standard"))

        envoye = appels[0]["data"].decode("utf-8")
        assert envoye.count("<speak") == 1


def _FauxSegment(duree_ms: int):
    """Doublure de PAROLE, pas un objet-jouet.

    Une fausse classe ne suffisait plus : le chemin nominal rogne desormais le
    silence de bord, ce qui demande un vrai AudioSegment. Un silence ne
    conviendrait pas davantage — `trim_silence` le reduirait a rien.
    """
    if duree_ms <= 0:
        from pydub import AudioSegment

        return AudioSegment.silent(duration=0, frame_rate=24000).set_channels(1)
    return _wav_minimal(duree_ms)


# ══════ Le chemin DEGRADE — aucune epreuve ne l'exercait ══════
#
# C'est ce trou qui a laisse passer le pire defaut de cette story : un
# `_run_blocking` reste derriere au demenagement faisait lever un NameError a
# chaque fragment, avale par la boucle de reprise et rapporte comme « pas
# d'audio ». Comme la configuration livre une cle Azure vide, ce chemin est le
# chemin PAR DEFAUT : toute synthese echouait, et 62 epreuves restaient vertes.


def _wav_minimal(duree_ms=400):
    """Une doublure de PAROLE, au format que rend edge-tts : 24 kHz mono 16 bits.

    Un silence ne conviendrait pas : le contournement le fait passer par
    `trim_silence`, qui le reduirait a rien — le test echouerait alors pour la
    mauvaise raison. `tests/test_audio_post.py` emploie la meme doublure.
    """
    from pydub import AudioSegment
    from pydub.generators import Sine

    return (
        Sine(440, sample_rate=24000)
        .to_audio_segment(duration=duree_ms)
        .set_channels(1)
        .set_sample_width(2)
        .apply_gain(-20.0)
    )


class _CommunicateDouble:
    """Doublure d'edge_tts.Communicate : ecrit un WAV la ou on le lui demande."""

    appels: list = []

    def __init__(self, text, **kwargs):
        type(self).appels.append({"text": text, **kwargs})

    async def save(self, chemin):
        _wav_minimal().export(chemin, format="wav")


class TestModeDegrade:
    @pytest.fixture(autouse=True)
    def _double(self, monkeypatch):
        import services.tts_edge as edge

        _CommunicateDouble.appels = []
        monkeypatch.setattr(edge.edge_tts, "Communicate", _CommunicateDouble)
        monkeypatch.setattr(edge, "RETRY_BASE_DELAY_S", 0)

    def test_rend_de_l_audio_pour_du_texte_simple(self):
        from services.tts_edge import EdgeTTSProvider

        segment = asyncio.run(
            EdgeTTSProvider().synthesize(
                "Bonjour tout le monde.", "fr-FR-HenriNeural", "standard"
            )
        )
        assert len(segment) > 0
        assert len(_CommunicateDouble.appels) >= 1

    def test_rend_de_l_audio_pour_du_ssml_avec_pause(self):
        from services.tts_edge import EdgeTTSProvider

        segment = asyncio.run(
            EdgeTTSProvider().synthesize(
                'Arrete-toi.<break time="1s"/>Regarde.', "fr-FR-HenriNeural", "standard"
            )
        )
        # Le contournement decoupe puis recolle : deux fragments parles plus la
        # pause. La duree doit donc depasser celle d'un seul fragment.
        assert len(segment) > 400
        assert len(_CommunicateDouble.appels) == 2

    def test_le_palier_hd_est_refuse_en_le_disant(self, caplog):
        from services.tts_edge import EdgeTTSProvider

        with caplog.at_level("WARNING"):
            asyncio.run(
                EdgeTTSProvider().synthesize("Bonjour.", "fr-FR-HenriNeural", "hd")
            )
        # L'endpoint gratuit ne sert que les voix standard : le taire ferait
        # croire a une haute definition qui n'existe pas.
        assert "hd" in caplog.text.lower()

    def test_un_echec_total_sort_par_le_contrat_documente(self, monkeypatch):
        import services.tts_edge as edge
        from services.tts_edge import EdgeTTSProvider

        class _Casse:
            def __init__(self, text, **kwargs):
                pass

            async def save(self, chemin):
                raise RuntimeError("endpoint indisponible")

        monkeypatch.setattr(edge.edge_tts, "Communicate", _Casse)
        with pytest.raises(ProviderError):
            asyncio.run(
                EdgeTTSProvider().synthesize("Bonjour.", "fr-FR-HenriNeural", "standard")
            )


# ══════ Ce que la requete Azure envoie vraiment ══════


class TestRequeteAzure:
    def test_porte_la_cle_le_type_et_le_format_de_sortie(self, azure, monkeypatch):
        # Aucune epreuve ne verifiait les en-tetes. Le format de sortie est
        # pourtant l'hypothese qui permet d'affirmer qu'`audio_post` et le
        # stockage S3 ne changent pas.
        from services.tts_azure import OUTPUT_FORMAT

        appels = _capture_appels(monkeypatch, _Reponse())
        monkeypatch.setattr("pydub.AudioSegment.from_file", lambda *a, **k: _FauxSegment(500))

        asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))

        entetes = appels[0]["headers"]
        assert entetes["Ocp-Apim-Subscription-Key"] == "cle-de-test"
        assert entetes["Content-Type"] == "application/ssml+xml"
        assert entetes["X-Microsoft-OutputFormat"] == OUTPUT_FORMAT
        assert "westeurope" in appels[0]["url"]

    def test_reessaie_une_limitation_de_debit_puis_reussit(self, azure, monkeypatch):
        appels = _capture_appels(monkeypatch, _Reponse(status_code=429), _Reponse())
        monkeypatch.setattr("pydub.AudioSegment.from_file", lambda *a, **k: _FauxSegment(500))

        asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))

        # Perdre une Scene entiere sur une limitation que le code qualifie
        # lui-meme de « reessayable » serait absurde.
        assert len(appels) == 2

    def test_ne_reessaie_jamais_une_cle_refusee(self, azure, monkeypatch):
        appels = _capture_appels(monkeypatch, _Reponse(status_code=401))
        with pytest.raises(ProviderAuthError):
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))
        assert len(appels) == 1

    def test_un_audio_vide_leve_plutot_que_publier_zero_ms(self, azure, monkeypatch):
        _capture_appels(monkeypatch, _Reponse())
        monkeypatch.setattr("pydub.AudioSegment.from_file", lambda *a, **k: _FauxSegment(0))
        with pytest.raises(ProviderError):
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))

    def test_un_audio_illisible_sort_par_le_contrat_documente(self, azure, monkeypatch):
        _capture_appels(monkeypatch, _Reponse(content=b"pas du wav"))

        def _casse(*a, **k):
            raise ValueError("format inconnu")

        monkeypatch.setattr("pydub.AudioSegment.from_file", _casse)
        with pytest.raises(ProviderError):
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))

    def test_le_corps_d_erreur_ne_remonte_pas_au_client(self, azure, monkeypatch):
        _capture_appels(monkeypatch, _Reponse(status_code=400, text="secret-interne-azure"))
        with pytest.raises(ProviderError) as e:
            asyncio.run(azure.synthesize("Bonjour.", "fr-FR-HenriNeural", "standard"))
        # Le diagnostic va au journal ; le message du job n'emporte pas un
        # fragment de reponse d'un tiers jusqu'a l'interface.
        assert "secret-interne-azure" not in str(e.value)

    @pytest.mark.parametrize(
        "region", ["evil.example.com", "west/europe", "west europe", "WESTEUROPE"]
    )
    def test_une_region_fantaisiste_est_refusee(self, region):
        from services.tts_azure import AzureTTSProvider

        # La region entre dans l'URL : une valeur avec un point enverrait la cle
        # d'abonnement a un hote que personne n'a choisi.
        with pytest.raises(ProviderAuthError):
            AzureTTSProvider(key="k", region=region)

    def test_une_voix_fantaisiste_est_refusee(self, azure):
        with pytest.raises(ProviderError):
            asyncio.run(azure.synthesize("Bonjour.", 'x"/><script>', "standard"))


# ══════ Le SSML produit est du XML bien forme ══════


class TestEchappement:
    @pytest.mark.parametrize(
        "texte",
        [
            "Rue Saint-Roch & Cie",
            "a < b et c & d",
            "Cafe &eacute; du coin",
            "deja &amp; echappe",
            "numerique &#233; ok",
            'x<break time="4s"/>y',
            '<speak><voice name="v">Deja enveloppe.</voice></speak>',
        ],
    )
    def test_le_document_reste_valide(self, azure, texte):
        import xml.etree.ElementTree as ET

        # Une esperluette dans « Rue Saint-Roch & Cie » produisait un document
        # invalide, donc un HTTP 400, donc la Scene ENTIEREMENT perdue.
        ET.fromstring(azure._wrap(texte, "fr-FR-HenriNeural"))

    def test_le_balisage_de_pause_traverse_intact(self, azure):
        # C'est tout l'interet du contrat : on n'analyse pas, on ne reecrit pas.
        assert '<break time="4s"/>' in azure._wrap(
            'x<break time="4s"/>y', "fr-FR-HenriNeural"
        )

    def test_un_document_deja_enveloppe_n_est_pas_reenveloppe(self, azure):
        deja = '<speak><voice name="v">Deja.</voice></speak>'
        assert azure._wrap(deja, "fr-FR-HenriNeural").count("<speak") == 1
