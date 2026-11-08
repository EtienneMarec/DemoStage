/* Pages de présentation : accueil, méthode, périmètre de confidentialité. */
'use strict';

App.pages.home = {
  title: L('Vue d’ensemble', 'Overview'),
  mount(el) {
    const projects = [
      ['foxsoft', 'FOX_Soft', 'C#, .NET, WPF, MVVM',
        L('L’application PC qui décrit, vérifie, archive et transfère la configuration incendie complète d’un navire. Topologie, détecteurs, logique Cause & Effects, migration des anciennes installations.', 'The desktop application that describes, validates, archives and transfers a ship’s complete fire-detection configuration. Topology, devices, Cause & Effects logic, migration of legacy installations.'),
        L('Livrable principal · 48 000 lignes · 1 255 tests', 'Main deliverable · 48,000 lines · 1,255 tests')],
      ['binviz', 'FoxBinVisualizer', 'C#, WPF',
        L('Décode un binaire champ par champ et compare deux fichiers pour répondre à une question précise : pourquoi mon export diffère-t-il de la référence ?', 'Decodes a binary file field by field and compares two files to answer one precise question: why does my export differ from the reference?'),
        L('Écrit en une matinée de débogage', 'Written during one morning of debugging')],
      ['frames', 'FoxFrameGenerator', L('C#, WPF, liaison série', 'C#, WPF, serial link'),
        L('Forge et envoie des trames pour tester un firmware sans le matériel complet, puis écoute plusieurs ports et décode le trafic en clair.', 'Builds and sends frames to test firmware without the full hardware, then listens on several ports and decodes the traffic into plain text.'),
        L('Utilisé par un collègue firmware', 'Used by a firmware colleague')],
      ['alarms', L('Analyseur de journaux d’alarmes', 'Alarm log analyser'), 'HTML, JavaScript',
        L('Note l’ergonomie d’alarme d’un navire selon EEMUA 191 et ISA 18.2 à partir d’un export de centrale, et rejoue l’état du panneau à l’instant choisi.', 'Rates a ship’s alarm ergonomics against EEMUA 191 and ISA 18.2 from a control panel export, and replays the panel state at any chosen moment.'),
        L('Une page, 100 % hors-ligne', 'One page, 100% offline')],
      ['fleet', 'PhoenixConfigAnalizer', 'C#, WPF',
        L('Explore un lot de configurations et compte les logiques réutilisées d’un navire à l’autre grâce à une signature canonique indépendante des noms.', 'Explores a batch of configurations and counts the logic reused from one ship to another, using a canonical signature that ignores names.'),
        L('A préparé la migration', 'Paved the way for the migration')],
      ['firedeck', 'FireDeck', 'C#, WPF, DWG, PDF, PPTX',
        L('Pour le service commercial : importe un plan de navire, y place les équipements de détection et en tire la nomenclature et les livrables de devis.', 'For the sales team: imports a ship plan, places the detection equipment on it and produces the bill of materials and quote deliverables.'),
        L('Menée jusqu’à une version complète', 'Taken to a complete version')],
    ];
    const timeline = [
      [L('Semaine 1', 'Week 1'), L('Comparatif Python et C#, puis prototype WPF pour prendre en main l’environnement. Il vit encore dans l’historique Git de ce dépôt (commits antérieurs à cette démo).', 'Python vs C# comparison, then a WPF prototype to get familiar with the stack. It still lives in this repository’s Git history (commits before this demo).')],
      [L('30 juin', 'June 30'), L('FOX_Soft 0.2.0 : la configuration complète et les échanges de fichiers sont consolidés.', 'FOX_Soft 0.2.0: full configuration and file exchanges are consolidated.')],
      [L('1ᵉʳ juillet', 'July 1'), L('0.3.0 : protection de l’application et début de l’éditeur Cause & Effects.', '0.3.0: application protection and the start of the Cause & Effects editor.')],
      [L('16 juillet', 'July 16'), L('0.3.1 : large lot de retours de l’équipe et manuels intégrés.', '0.3.1: a large batch of team feedback and built-in user manuals.')],
      [L('31 juillet', 'July 31'), L('0.4.0 : module d’entrées/sorties, import des anciennes configurations, thème sombre.', '0.4.0: I/O module, import of legacy configurations, dark theme.')],
      [L('14 août', 'August 14'), L('0.5.0 : calcul de courant par boucle, document de mise en service, rapports PDF réécrits sur des bibliothèques libres.', '0.5.0: per-loop current calculation, commissioning document, PDF reports rewritten on open-source libraries.')],
      [L('Fin de stage', 'Final weeks'), L('Analyseur d’alarmes, FireDeck, présentations internes sur l’IA et application-tutoriel pour les collègues non développeurs.', 'Alarm analyser, FireDeck, internal talks about AI and a tutorial application for non-developer colleagues.')],
    ];
    el.innerHTML = `
      <section class="hero">
        <div class="kicker">${L('Stage ingénieur de 2ᵉ année · TELECOM Nancy · 15 juin – 20 août 2026', 'Second-year engineering internship · TELECOM Nancy · June 15 – August 20, 2026')}</div>
        <h1>${L('Six logiciels pour configurer et analyser des systèmes de détection incendie marine', 'Six pieces of software to configure and analyse marine fire-detection systems')}</h1>
        <p>${L('Pendant dix semaines chez Marinelec Technologies, j’ai développé l’application de configuration d’une nouvelle centrale incendie pour navires, ainsi que les outils créés autour d’elle. Cette démo se manipule directement dans le navigateur, sans le code source ni les données de l’entreprise.', 'Over ten weeks at Marinelec Technologies, I developed the configuration application for a new ship fire-detection control panel, along with the tools built around it. This demo runs directly in the browser, without the company’s source code or data.')}</p>
      </section>
      <div class="stats">
        <div class="stat"><b>~${nf(67000)}</b><span>${L('lignes de code livrées', 'lines of code delivered')}</span></div>
        <div class="stat"><b>${nf(1255)}</b><span>${L('tests automatisés au vert sur FOX_Soft', 'passing automated tests on FOX_Soft')}</span></div>
        <div class="stat"><b>6</b><span>${L('applications et outils', 'applications and tools')}</span></div>
        <div class="stat"><b>10</b><span>${L('semaines, de 0.2.0 à 0.5.0', 'weeks, from 0.2.0 to 0.5.0')}</span></div>
      </div>
      <p class="sim-banner"><strong>${L('Comment lire cette démo.', 'How to read this demo.')}</strong> ${L('Chaque outil est une simulation réécrite pour ce dépôt : mêmes usages et mêmes idées, mais formats inventés et données fictives.', 'Each tool is a simulation rewritten for this repository: same use cases and ideas, but made-up formats and fictional data.')} <a href="#/scope">${L('Voir ce qui est masqué et pourquoi', 'See what is hidden and why')}</a>.</p>
      <h2 class="section-title">${L('Les projets', 'The projects')}</h2>
      <div class="projects">
        ${projects.map(([id, name, stack, text, meta]) => `
          <a class="project" href="#/${id}">
            <h3>${name}</h3>
            <div class="meta">${stack}</div>
            <p>${text}</p>
            <div class="meta">${meta}</div>
            <div class="go">${L('Ouvrir la démo', 'Open the demo')}</div>
          </a>`).join('')}
      </div>
      <h2 class="section-title">${L('Le déroulé', 'Timeline')}</h2>
      <div class="card timeline">
        ${timeline.map(([d, t]) => `<div><b>${d}</b><span>${t}</span></div>`).join('')}
      </div>`;
  },
};

App.pages.method = {
  title: L('Méthode & bilan', 'Method & results'),
  mount(el) {
    const hard = [
      [L('Un format binaire strict.', 'A strict binary format.'), L('Un seul octet de décalage rend la configuration illisible, et la spécification a évolué en cours de route. D’où un outil dédié et une validation contre une référence.', 'A single misplaced byte makes the configuration unreadable, and the specification changed along the way. Hence a dedicated tool and validation against a reference.')],
      [L('La coordination avec le firmware.', 'Coordination with the firmware.'), L('Il a fallu figer et documenter le format pour le valider point par point avec le collègue en charge de la carte.', 'The format had to be frozen and documented so it could be validated point by point with the colleague in charge of the board.')],
      [L('Une bibliothèque devenue payante.', 'A library that became paid.'), L('Tout l’export PDF a été réécrit sur des bibliothèques libres.', 'The whole PDF export was rewritten on open-source libraries.')],
      [L('Migrer sans rien perdre en silence.', 'Migrating without silent losses.'), L('Toute valeur sans équivalent est tracée ou soumise à l’opérateur, jamais remplacée d’office.', 'Any value without an equivalent is reported or left to the operator, never replaced automatically.')],
    ];
    el.innerHTML = `
      <header class="page-head">
        <h1>${L('Méthode et bilan', 'Method and results')}</h1>
        <p>${L('Un développement assisté par IA ne tient que si l’ingénierie autour reste stricte : le gain de vitesse se paie sinon en dette technique.', 'AI-assisted development only holds up if the engineering around it stays strict; otherwise the speed gain is paid back in technical debt.')}</p>
      </header>
      <div class="stack">
        <section class="card">
          <h2>${L('Le cycle de chaque sprint', 'The cycle of each sprint')}</h2>
          <div class="flow">
            <div><b>${L('1. Spécifier', '1. Specify')}</b>${L('Préciser l’objectif à partir du cahier des charges.', 'Define the goal from the specification.')}</div>
            <div><b>${L('2. Générer', '2. Generate')}</b>${L('Produire le code avec Claude Code.', 'Produce the code with Claude Code.')}</div>
            <div><b>${L('3. Valider', '3. Validate')}</b>${L('Compiler et vérifier le résultat et l’ergonomie à la main.', 'Build, then check the result and usability by hand.')}</div>
            <div><b>${L('4. Tester', '4. Test')}</b>${L('Verrouiller le comportement par des tests automatisés.', 'Lock the behaviour in with automated tests.')}</div>
            <div><b>${L('5. Documenter', '5. Document')}</b>${L('Tenir à jour le journal des versions et des décisions.', 'Keep the changelog and decision log up to date.')}</div>
          </div>
          <p class="note">${L('Le code le plus sensible a aussi fait l’objet de revues croisées : plusieurs agents relisent le même code de façon indépendante. Ces revues ont trouvé de vrais défauts, ensuite corrigés et couverts par des tests.', 'The most sensitive code also went through cross-reviews, with several agents reviewing the same code independently. These reviews found real defects, which were then fixed and covered by tests.')}</p>
        </section>
        <section class="grid two">
          <div class="card">
            <h2>${L('Architecture de FOX_Soft', 'FOX_Soft architecture')}</h2>
            <p>${L('Quatre projets et une dépendance à sens unique, pour que le cœur métier reste testable sans interface.', 'Four projects and one-way dependencies, so the business core stays testable without a user interface.')}</p>
            <div class="flow" style="flex-direction:column">
              <div><b>App</b>${L('Vues XAML, ViewModels et services, en MVVM strict.', 'XAML views, ViewModels and services, in strict MVVM.')}</div>
              <div><b>Serialization</b>${L('Archive de projet, binaire, exports PDF, Excel et texte.', 'Project archive, binary file, PDF, Excel and text exports.')}</div>
              <div><b>Core</b>${L('Domaine et règles métier, sans aucune dépendance graphique.', 'Domain model and business rules, with no UI dependency at all.')}</div>
              <div><b>Tests</b>${L('xUnit et Moq, appuyés sur les trois autres.', 'xUnit and Moq, built on the other three.')}</div>
            </div>
            <p class="note">${L('Principe directeur : une règle métier n’est définie qu’à un seul endroit. L’écran, l’import et l’export vérifient donc la même chose.', 'Guiding principle: each business rule is defined in exactly one place, so the screen, the import and the export all check the same thing.')}</p>
          </div>
          <div class="card">
            <h2>${L('Ce qui a été difficile', 'What was hard')}</h2>
            <ul style="margin:0;padding-left:18px;display:grid;gap:8px">
              ${hard.map(([t, d]) => `<li><strong>${t}</strong> ${d}</li>`).join('')}
            </ul>
          </div>
        </section>
        <section class="card">
          <h2>${L('L’IA au service de l’entreprise', 'AI for the whole company')}</h2>
          <p>${L('Le second volet du stage consistait à faire connaître l’apport de l’IA au-delà du développement : présentation des usages par métier devant les services, étude d’obsolescence assistée, échange avec une société du groupe sur l’IA locale, et DemoSniffeur, une application-tutoriel qui montre à un collègue non développeur comment créer un outil utile en moins de deux heures.', 'The second part of the internship was about showing what AI can bring beyond development: a talk on use cases for each team, an AI-assisted obsolescence study, an exchange with a sister company about local AI, and DemoSniffeur, a tutorial application showing a non-developer colleague how to build a useful tool in under two hours.')}</p>
        </section>
        <section class="card">
          <h2>${L('Pile technique', 'Tech stack')}</h2>
          <p style="margin:0">C#, .NET 8 ${L('et', 'and')} 10, WPF, CommunityToolkit.Mvvm, xUnit, Moq, ClosedXML, PDFsharp/MigraDoc, Open XML SDK, Inno Setup, Git, JavaScript, Claude Code.</p>
        </section>
      </div>`;
  },
};

App.pages.scope = {
  title: L('Ce qui est masqué', 'What is hidden'),
  mount(el) {
    const rows = [
      [L('Code source', 'Source code'), L('Non publié. Aucun fichier des applications livrées ne figure dans ce dépôt.', 'Not published. No file from the delivered applications is in this repository.'), L('Tout est réécrit en JavaScript pour la démo. La logique se limite à ce que l’utilisateur voit.', 'Everything is rewritten in JavaScript for the demo. The logic only covers what the user sees.')],
      [L('Format de fichier de la centrale', 'Control panel file format'), L('Table des champs, tailles, positions et révisions non publiées.', 'Field table, sizes, offsets and revisions not published.'), L('Un format inventé, « DEMO », sans rapport avec le format réel.', 'A made-up "DEMO" format, unrelated to the real one.')],
      [L('Contrôle d’intégrité', 'Integrity check'), L('Paramètres du calcul réel non publiés.', 'Parameters of the real calculation not published.'), L('Uniquement des algorithmes publics : CRC-16/CCITT-FALSE, CRC-16/MODBUS, somme, XOR.', 'Public algorithms only: CRC-16/CCITT-FALSE, CRC-16/MODBUS, sum, XOR.')],
      [L('Protocole série interne', 'Internal serial protocol'), L('Enveloppe, codes de message et structure des événements non publiés.', 'Envelope, message codes and event structure not published.'), L('Un protocole fictif. Seul Modbus RTU, qui est un standard ouvert, est conforme.', 'A fictional protocol. Only Modbus RTU, an open standard, is accurate.')],
      [L('Sécurité', 'Security'), L('Licence, chiffrement et résultats d’audit non décrits.', 'Licensing, encryption and audit findings not described.'), L('Absents de la démo : ils n’y auraient aucun sens et leur détail n’a pas à être public.', 'Left out of the demo: they would be meaningless here and their details should not be public.')],
      [L('Données clients', 'Customer data'), L('Noms de navires, plans, configurations et journaux réels non publiés.', 'Real ship names, plans, configurations and logs not published.'), L('Navires, plans, flotte et journaux générés de toutes pièces.', 'Ships, plans, fleet and logs generated from scratch.')],
      [L('Valeurs techniques', 'Technical values'), L('Consommations des équipements et tables de conversion non publiées.', 'Equipment power consumption and conversion tables not published.'), L('Valeurs de démonstration, choisies pour illustrer le mécanisme.', 'Demo values, chosen to illustrate the mechanism.')],
      [L('Informations internes', 'Internal information'), L('Organisation, chiffres de l’entreprise, documents, chemins réseau et coordonnées non publiés.', 'Organisation, company figures, documents, network paths and contact details not published.'), L('Le rapport de stage n’est pas inclus. Les captures ne montrent que des données de test synthétiques.', 'The internship report is not included. Screenshots only show synthetic test data.')],
    ];
    el.innerHTML = `
      <header class="page-head">
        <h1>${L('Ce qui est réel, simulé ou masqué', 'What is real, simulated or hidden')}</h1>
        <p>${L('L’objectif est de montrer ce qui a été construit et comment, sans exposer ce qui appartient à l’entreprise ou touche à la sûreté de ses produits.', 'The goal is to show what was built and how, without exposing what belongs to the company or affects the safety of its products.')}</p>
      </header>
      <div class="stack">
        <div class="grid three">
          <div class="card"><span class="pill ok">${L('Réel', 'Real')}</span><p style="margin:8px 0 0">${L('Les fonctionnalités décrites, les noms des outils, les chiffres du projet et les captures de l’application avec des données de test.', 'The features described, the tool names, the project figures and the screenshots of the application with test data.')}</p></div>
          <div class="card"><span class="pill info">${L('Simulé', 'Simulated')}</span><p style="margin:8px 0 0">${L('Toutes les démos interactives : l’usage est fidèle, mais la mise en œuvre est une version réduite écrite pour ce dépôt.', 'All the interactive demos: the use cases are faithful, but the implementation is a reduced version written for this repository.')}</p></div>
          <div class="card"><span class="pill neutral">${L('Masqué', 'Hidden')}</span><p style="margin:8px 0 0">${L('Le code d’origine, les formats, les protocoles, la sécurité et toutes les données de l’entreprise et de ses clients.', 'The original code, formats, protocols, security, and all company and customer data.')}</p></div>
        </div>
        <div class="table-wrap">
          <table class="data masked">
            <thead><tr><th>${L('Sujet', 'Topic')}</th><th>${L('Dans le logiciel réel', 'In the real software')}</th><th>${L('Dans cette démo', 'In this demo')}</th></tr></thead>
            <tbody>${rows.map((r) => `<tr><td class="wrap"><strong>${r[0]}</strong></td><td class="wrap">${r[1]}</td><td class="wrap">${r[2]}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <p class="note">${L('Ces simulations ne sont pas des outils utilisables en exploitation et ne doivent pas servir à configurer ou tester un système de détection incendie réel. Marinelec, PHOENIX et FOX désignent des produits et une société tiers ; les droits correspondants restent à leurs titulaires.', 'These simulations are not operational tools and must not be used to configure or test a real fire-detection system. Marinelec, PHOENIX and FOX refer to a third-party company and products; all related rights remain with their owners.')}</p>
      </div>`;
  },
};
