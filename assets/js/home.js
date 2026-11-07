/* Pages de présentation : accueil, méthode, périmètre de confidentialité. */
'use strict';

App.pages.home = {
  title: 'Vue d’ensemble',
  mount(el) {
    const projects = [
      ['foxsoft', 'FOX_Soft', 'C#, .NET, WPF, MVVM', 'L’application PC qui décrit, vérifie, archive et transfère la configuration incendie complète d’un navire. Topologie, détecteurs, logique Cause & Effects, migration des anciennes installations.', 'Livrable principal · 48 000 lignes · 1 255 tests'],
      ['binviz', 'FoxBinVisualizer', 'C#, WPF', 'Décode un binaire champ par champ et compare deux fichiers pour répondre à une question précise : pourquoi mon export diffère-t-il de la référence ?', 'Écrit en une matinée de débogage'],
      ['frames', 'FoxFrameGenerator', 'C#, WPF, liaison série', 'Forge et envoie des trames pour tester un firmware sans le matériel complet, puis écoute plusieurs ports et décode le trafic en clair.', 'Utilisé par un collègue firmware'],
      ['alarms', 'Analyseur de journaux d’alarmes', 'HTML, JavaScript', 'Note l’ergonomie d’alarme d’un navire selon EEMUA 191 et ISA 18.2 à partir d’un export de centrale, et rejoue l’état du panneau à l’instant choisi.', 'Une page, 100 % hors-ligne'],
      ['fleet', 'PhoenixConfigAnalizer', 'C#, WPF', 'Explore un lot de configurations et compte les logiques réutilisées d’un navire à l’autre grâce à une signature canonique indépendante des noms.', 'A préparé la migration'],
      ['firedeck', 'FireDeck', 'C#, WPF, DWG, PDF, PPTX', 'Pour le service commercial : importe un plan de navire, y place les équipements de détection et en tire la nomenclature et les livrables de devis.', 'Menée jusqu’à une version complète'],
    ];
    el.innerHTML = `
      <section class="hero">
        <div class="kicker">Stage ingénieur de 2ᵉ année · TELECOM Nancy · 15 juin – 20 août 2026</div>
        <h1>Six logiciels pour configurer et analyser des systèmes de détection incendie marine</h1>
        <p>Pendant dix semaines chez Marinelec Technologies, j’ai développé l’application de configuration d’une nouvelle centrale incendie pour navires, ainsi que les outils créés autour d’elle. Cette démo se manipule directement dans le navigateur, sans le code source ni les données de l’entreprise.</p>
      </section>
      <div class="stats">
        <div class="stat"><b>~67 000</b><span>lignes de code livrées</span></div>
        <div class="stat"><b>1 255</b><span>tests automatisés au vert sur FOX_Soft</span></div>
        <div class="stat"><b>6</b><span>applications et outils</span></div>
        <div class="stat"><b>10</b><span>semaines, de 0.2.0 à 0.5.0</span></div>
      </div>
      <p class="sim-banner"><strong>Comment lire cette démo.</strong> Chaque outil est une simulation réécrite pour ce dépôt : mêmes usages et mêmes idées, mais formats inventés et données fictives. <a href="#/scope">Voir ce qui est masqué et pourquoi</a>.</p>
      <h2 class="section-title">Les projets</h2>
      <div class="projects">
        ${projects.map(([id, name, stack, text, meta]) => `
          <a class="project" href="#/${id}">
            <h3>${name}</h3>
            <div class="meta">${stack}</div>
            <p>${text}</p>
            <div class="meta">${meta}</div>
            <div class="go">Ouvrir la démo</div>
          </a>`).join('')}
      </div>
      <h2 class="section-title">Le déroulé</h2>
      <div class="card timeline">
        <div><b>Semaine 1</b><span>Comparatif Python et C#, puis prototype WPF pour prendre en main l’environnement. Il vit encore dans l’historique Git de ce dépôt (commits antérieurs à cette démo).</span></div>
        <div><b>30 juin</b><span>FOX_Soft 0.2.0 : la configuration complète et les échanges de fichiers sont consolidés.</span></div>
        <div><b>1ᵉʳ juillet</b><span>0.3.0 : protection de l’application et début de l’éditeur Cause & Effects.</span></div>
        <div><b>16 juillet</b><span>0.3.1 : large lot de retours de l’équipe et manuels intégrés.</span></div>
        <div><b>31 juillet</b><span>0.4.0 : module d’entrées/sorties, import des anciennes configurations, thème sombre.</span></div>
        <div><b>14 août</b><span>0.5.0 : calcul de courant par boucle, document de mise en service, rapports PDF réécrits sur des bibliothèques libres.</span></div>
        <div><b>Fin de stage</b><span>Analyseur d’alarmes, FireDeck, présentations internes sur l’IA et application-tutoriel pour les collègues non développeurs.</span></div>
      </div>`;
  },
};

App.pages.method = {
  title: 'Méthode & bilan',
  mount(el) {
    el.innerHTML = `
      <header class="page-head">
        <h1>Méthode et bilan</h1>
        <p>Un développement assisté par IA ne tient que si l’ingénierie autour reste stricte : le gain de vitesse se paie sinon en dette technique.</p>
      </header>
      <div class="stack">
        <section class="card">
          <h2>Le cycle de chaque sprint</h2>
          <div class="flow">
            <div><b>1. Spécifier</b>Préciser l’objectif à partir du cahier des charges.</div>
            <div><b>2. Générer</b>Produire le code avec Claude Code.</div>
            <div><b>3. Valider</b>Compiler et vérifier le résultat et l’ergonomie à la main.</div>
            <div><b>4. Tester</b>Verrouiller le comportement par des tests automatisés.</div>
            <div><b>5. Documenter</b>Tenir à jour le journal des versions et des décisions.</div>
          </div>
          <p class="note">Le code le plus sensible a aussi fait l’objet de revues croisées : plusieurs agents relisent le même code de façon indépendante. Ces revues ont trouvé de vrais défauts, ensuite corrigés et couverts par des tests.</p>
        </section>
        <section class="grid two">
          <div class="card">
            <h2>Architecture de FOX_Soft</h2>
            <p>Quatre projets et une dépendance à sens unique, pour que le cœur métier reste testable sans interface.</p>
            <div class="flow" style="flex-direction:column">
              <div><b>App</b>Vues XAML, ViewModels et services, en MVVM strict.</div>
              <div><b>Serialization</b>Archive de projet, binaire, exports PDF, Excel et texte.</div>
              <div><b>Core</b>Domaine et règles métier, sans aucune dépendance graphique.</div>
              <div><b>Tests</b>xUnit et Moq, appuyés sur les trois autres.</div>
            </div>
            <p class="note">Principe directeur : une règle métier n’est définie qu’à un seul endroit. L’écran, l’import et l’export vérifient donc la même chose.</p>
          </div>
          <div class="card">
            <h2>Ce qui a été difficile</h2>
            <ul style="margin:0;padding-left:18px;display:grid;gap:8px">
              <li><strong>Un format binaire strict.</strong> Un seul octet de décalage rend la configuration illisible, et la spécification a évolué en cours de route. D’où un outil dédié et une validation contre une référence.</li>
              <li><strong>La coordination avec le firmware.</strong> Il a fallu figer et documenter le format pour le valider point par point avec le collègue en charge de la carte.</li>
              <li><strong>Une bibliothèque devenue payante.</strong> Tout l’export PDF a été réécrit sur des bibliothèques libres.</li>
              <li><strong>Migrer sans rien perdre en silence.</strong> Toute valeur sans équivalent est tracée ou soumise à l’opérateur, jamais remplacée d’office.</li>
            </ul>
          </div>
        </section>
        <section class="card">
          <h2>L’IA au service de l’entreprise</h2>
          <p>Le second volet du stage consistait à faire connaître l’apport de l’IA au-delà du développement : présentation des usages par métier devant les services, étude d’obsolescence assistée, échange avec une société du groupe sur l’IA locale, et DemoSniffeur, une application-tutoriel qui montre à un collègue non développeur comment créer un outil utile en moins de deux heures.</p>
        </section>
        <section class="card">
          <h2>Pile technique</h2>
          <p style="margin:0">C#, .NET 8 et 10, WPF, CommunityToolkit.Mvvm, xUnit, Moq, ClosedXML, PDFsharp/MigraDoc, Open XML SDK, Inno Setup, Git, JavaScript, Claude Code.</p>
        </section>
      </div>`;
  },
};

App.pages.scope = {
  title: 'Ce qui est masqué',
  mount(el) {
    const rows = [
      ['Code source', 'Non publié. Aucun fichier des applications livrées ne figure dans ce dépôt.', 'Tout est réécrit en JavaScript pour la démo. La logique se limite à ce que l’utilisateur voit.'],
      ['Format de fichier de la centrale', 'Table des champs, tailles, positions et révisions non publiées.', 'Un format inventé, « DEMO », sans rapport avec le format réel.'],
      ['Contrôle d’intégrité', 'Paramètres du calcul réel non publiés.', 'Uniquement des algorithmes publics : CRC-16/CCITT-FALSE, CRC-16/MODBUS, somme, XOR.'],
      ['Protocole série interne', 'Enveloppe, codes de message et structure des événements non publiés.', 'Un protocole fictif. Seul Modbus RTU, qui est un standard ouvert, est conforme.'],
      ['Sécurité', 'Licence, chiffrement et résultats d’audit non décrits.', 'Absents de la démo : ils n’y auraient aucun sens et leur détail n’a pas à être public.'],
      ['Données clients', 'Noms de navires, plans, configurations et journaux réels non publiés.', 'Navires, plans, flotte et journaux générés de toutes pièces.'],
      ['Valeurs techniques', 'Consommations des équipements et tables de conversion non publiées.', 'Valeurs de démonstration, choisies pour illustrer le mécanisme.'],
      ['Informations internes', 'Organisation, chiffres de l’entreprise, documents, chemins réseau et coordonnées non publiés.', 'Le rapport de stage n’est pas inclus. Les captures ne montrent que des données de test synthétiques.'],
    ];
    el.innerHTML = `
      <header class="page-head">
        <h1>Ce qui est réel, simulé ou masqué</h1>
        <p>L’objectif est de montrer ce qui a été construit et comment, sans exposer ce qui appartient à l’entreprise ou touche à la sûreté de ses produits.</p>
      </header>
      <div class="stack">
        <div class="grid three">
          <div class="card"><span class="pill ok">Réel</span><p style="margin:8px 0 0">Les fonctionnalités décrites, les noms des outils, les chiffres du projet et les captures de l’application avec des données de test.</p></div>
          <div class="card"><span class="pill info">Simulé</span><p style="margin:8px 0 0">Toutes les démos interactives : l’usage est fidèle, mais la mise en œuvre est une version réduite écrite pour ce dépôt.</p></div>
          <div class="card"><span class="pill neutral">Masqué</span><p style="margin:8px 0 0">Le code d’origine, les formats, les protocoles, la sécurité et toutes les données de l’entreprise et de ses clients.</p></div>
        </div>
        <div class="table-wrap">
          <table class="data masked">
            <thead><tr><th>Sujet</th><th>Dans le logiciel réel</th><th>Dans cette démo</th></tr></thead>
            <tbody>${rows.map((r) => `<tr><td class="wrap"><strong>${r[0]}</strong></td><td class="wrap">${r[1]}</td><td class="wrap">${r[2]}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <p class="note">Ces simulations ne sont pas des outils utilisables en exploitation et ne doivent pas servir à configurer ou tester un système de détection incendie réel. Marinelec, PHOENIX et FOX désignent des produits et une société tiers ; les droits correspondants restent à leurs titulaires.</p>
      </div>`;
  },
};
