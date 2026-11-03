-- =============================================================================
-- Carnet de Montréal — lieux de départ (FACULTATIF)
-- Les 16 lieux du POC, sans visites : ils apparaissent « À faire ».
-- Supprimez ceux qui ne vous intéressent pas depuis l'app (fiche > Supprimer).
-- =============================================================================
insert into public.places (name, cat, quartier, lat, lng, season, metro_station, metro_lines, description) values
('Belvédère Kondiaronk', 'vues', 'Mont Royal', 45.5040, -73.5873, 'toute', 'Mont-Royal + bus 11', '{orange}',
 'Le belvédère du Chalet du Mont-Royal, face au centre-ville et au fleuve. On y monte à pied par les escaliers depuis l''avenue des Pins.'),
('Belvédère Camillien-Houde', 'vues', 'Mont Royal', 45.5098, -73.5880, 'toute', 'Mont-Royal + bus 11', '{orange}',
 'L''autre belvédère du mont Royal, tourné vers l''est et le Stade. Plus calme au coucher du soleil.'),
('Tour de Montréal', 'vues', 'Hochelaga', 45.5579, -73.5516, 'toute', 'Pie-IX', '{verte}',
 'L''observatoire en haut du mât incliné du Stade olympique. Vue sur tout l''est de l''île.'),
('Schwartz''s', 'bouffe', 'Plateau', 45.5166, -73.5779, 'toute', 'Sherbrooke', '{orange}',
 'Le smoked meat historique du boulevard Saint-Laurent. File d''attente quasi garantie, mais elle avance vite.'),
('St-Viateur Bagel', 'bouffe', 'Mile End', 45.5226, -73.6013, 'toute', 'Laurier', '{orange}',
 'Bagels cuits au feu de bois, ouvert jour et nuit. À prendre chauds, nature ou sésame.'),
('Marché Jean-Talon', 'bouffe', 'Petite-Italie', 45.5363, -73.6145, 'toute', 'De Castelnau', '{bleue}',
 'Le grand marché de la Petite-Italie, ouvert toute l''année. Allées en plein air l''été, halle fermée l''hiver.'),
('Marché Atwater', 'bouffe', 'Saint-Henri', 45.4808, -73.5771, 'toute', 'Lionel-Groulx', '{verte,orange}',
 'Marché couvert au bord du canal de Lachine, avec bouchers et fromagers. À combiner avec une balade sur le canal.'),
('Basilique Notre-Dame', 'culture', 'Vieux-Montréal', 45.5045, -73.5562, 'toute', 'Place-d''Armes', '{orange}',
 'Intérieur bleu et or dans le Vieux-Montréal. Spectacle son et lumière en soirée.'),
('Musée des beaux-arts', 'culture', 'Centre-ville', 45.4985, -73.5794, 'hiver', 'Guy-Concordia', '{verte}',
 'Le grand musée de la rue Sherbrooke. La collection permanente vaut le détour, même sans expo temporaire.'),
('Oratoire Saint-Joseph', 'culture', 'Côte-des-Neiges', 45.4925, -73.6178, 'toute', 'Côte-des-Neiges', '{bleue}',
 'Le grand dôme sur le flanc nord-ouest du mont Royal. Beaucoup de marches, belle vue en haut.'),
('Biosphère', 'culture', 'Parc Jean-Drapeau', 45.5140, -73.5310, 'ete', 'Jean-Drapeau', '{jaune}',
 'Le dôme géodésique de l''Expo 67 sur l''île Sainte-Hélène, devenu musée de l''environnement.'),
('Parc La Fontaine', 'parcs', 'Plateau', 45.5271, -73.5696, 'toute', 'Sherbrooke', '{orange}',
 'Grand parc du Plateau autour d''un étang. Pique-nique l''été, patin sur l''étang l''hiver.'),
('Canal de Lachine', 'parcs', 'Griffintown', 45.4870, -73.5655, 'ete', 'Lionel-Groulx', '{verte,orange}',
 'Piste cyclable le long du canal, de Saint-Henri au Vieux-Port. En BIXI aux beaux jours.'),
('Jardin botanique', 'parcs', 'Rosemont', 45.5600, -73.5630, 'ete', 'Pie-IX', '{verte}',
 'Immense jardin à côté du Stade. Les Jardins de lumière animent les soirées d''automne.'),
('Quartier des spectacles', 'sorties', 'Centre-ville', 45.5088, -73.5664, 'toute', 'Place-des-Arts', '{verte}',
 'Le cœur des festivals : Jazz et Francos l''été, Montréal en Lumière l''hiver.'),
('Patinoire du Vieux-Port', 'sorties', 'Vieux-Montréal', 45.5075, -73.5510, 'hiver', 'Place-d''Armes', '{orange}',
 'Patinoire réfrigérée face au fleuve, avec musique le soir.');
