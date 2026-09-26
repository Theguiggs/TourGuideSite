# V?rifications avant publication ? 26 septembre 2026

- Les six arbres de travail conserv?s sont reconnus par Git ; `git worktree prune --dry-run --verbose` ne signale aucun enregistrement obsol?te.
- Les 1 690 fichiers d?plac?s correspondent aux empreintes du manifeste, en tenant compte de la correction enregistr?e des neuf liens du document historique.
- Les 85 branches d?origine et les deux stashes ont ?t? pr?serv?s. La branche de publication est ajout?e s?par?ment.
- Le contr?le a d?tect? une ACL vide sur un fichier de configuration priv? sauvegard?. Les droits de lecture/?criture ont ?t? r?tablis pour le compte Windows propri?taire et SYSTEM ; le contenu est identique ? son empreinte d?origine. Ce fichier reste hors Git.
- Le script de suivi peut recevoir `-WorkspaceRoot` pour fonctionner depuis son emplacement versionn?. Son ex?cution sur l?espace Bmad a r?ussi.
- Le commit est limit? aux documents de r?organisation et au script de suivi. Les changements applicatifs pr?existants ne sont pas inclus.
- Le d?marrage web et Metro avait ?t? v?rifi? lors de la r?organisation. Cette publication documentaire ne constitue pas une nouvelle validation fonctionnelle compl?te des applications.
