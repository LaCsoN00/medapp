// Pour utiliser les imports ES modules, ajoute "type": "module" dans package.json ou renomme ce fichier en .mjs
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const geojsonPath = './scripts/etablissements.geojson'; // Mets ici le nom de ton fichier GeoJSON

// --- Ajout mapping ville → province ---
const CITY_TO_PROVINCE = {
  'Libreville': 'Estuaire',
  'Owendo': 'Estuaire',
  'Ntoum': 'Estuaire',
  'Akanda': 'Estuaire',
  'Bikélé': 'Estuaire',
  'Alenakiri': 'Estuaire',
  'Melen': 'Estuaire',
  'Lebamba': 'Ngounié',
  'Agoungou': 'Estuaire',
  'SNI': 'Estuaire',
  'Okala': 'Estuaire',
  'Louis': 'Estuaire',
  'Lalala': 'Estuaire',
  'Setrag': 'Estuaire',
  'Charbonnages': 'Estuaire',
  'Pompidou': 'Estuaire',
  'Nzeng Ayong': 'Estuaire',
  'Akournam': 'Estuaire',
  'Akebe': 'Estuaire',
  'Bas de Guegue': 'Estuaire',
  'Kalikak': 'Estuaire',
  'PK9': 'Estuaire',
  'PK11': 'Estuaire',
  'PK12': 'Estuaire',
  'Alibandengue': 'Estuaire',
  'Ozangué': 'Estuaire',
  'Sainte Marie': 'Estuaire',
  'Centre ville': 'Estuaire',
  'Cité OCTRA': 'Estuaire',
  'Cité Rose': 'Estuaire',
  'Sibang': 'Estuaire',
  "Groupe Médical d'Akanda": 'Estuaire',
  'Leon MBA': 'Estuaire',
  'MEBIAME': 'Estuaire',
  'Hassan II': 'Estuaire',
  'Fidèle OMBANGA': 'Estuaire',
  'Jean Claude BROUILLET': 'Estuaire',
  'Sophie Ntoutoume Emane': 'Estuaire',
  'Albert SCHWEITZER': 'Estuaire',
  'Edouard MBADOU': 'Estuaire',
  'Cyriaque NKOGHE ABIAGHE': 'Estuaire',
  'Boulevard du président Leon MBA': 'Estuaire',
  'Avenue Félix Houphouët Boigny': 'Estuaire',
  'Avenue Daniel BA OUMAR': 'Estuaire',
  'Rue Gr Nazaire Boulingui': 'Estuaire',
  'Belle vue I': 'Estuaire',
  'Avenue Joseph Deemin': 'Estuaire',
  'Avenue de Cointet': 'Estuaire',
  'Avenue Lubin martial ntoutoume obame': 'Estuaire',
  'Avenue de Pékin': 'Estuaire',
  'Avenue Jean Marc REVIGNET-INGUEZA': 'Estuaire',
  'Avenue Georges Damas Aleka': 'Estuaire',
  'Rue 3.068.LA': 'Estuaire',
  'Rue Buan Carlos 1er': 'Estuaire',
  'Rue Colonel Jean Marie DJOUE DABANIE': 'Estuaire',
  'Rue Antchouet Rabaguino': 'Estuaire',
  'Rue Pascal Obame': 'Estuaire',
  'Rue leonie waterman': 'Estuaire',
  'Boulevard Omar BONGO': 'Estuaire',
  'Boulevard leon mba': 'Estuaire',
  'Premier arrondissement': 'Estuaire',
  '5ème Arrondissement': 'Estuaire',
  '1 arrondissement': 'Estuaire',
  'carrefour des jeunes avea': 'Estuaire',
  'Carrefour Canté': 'Estuaire',
  'Impasse Dr Charles Ndembet': 'Estuaire',
  'Impasse MBA NGUEMA': 'Estuaire',
  'poste d akebe': 'Estuaire',
  'bas de guegue': 'Estuaire',
  'sainte marie': 'Estuaire',
  'Léopold Sedar SENGHOR': 'Estuaire',
  'Félix Éboué': 'Estuaire',
  'Mt Bouet': 'Estuaire',
  '3.068.LA': 'Estuaire',
  '4.134.H': 'Estuaire',
  'Antchouet Rabaguino': 'Estuaire',
  'Igoho Demba': 'Estuaire',
  'Angel Onewin': 'Estuaire',
  'Jean Urbain NGOLEINE': 'Estuaire',
  'Hamani DIORIE': 'Estuaire',
  'Plaine Orety': 'Estuaire',
  'Rene Raponda': 'Estuaire',
  'PK6': 'Estuaire',
  'PK8': 'Estuaire',
  'Joseph NGOUA': 'Estuaire',
  'Catherine MISTOUL YENGA': 'Estuaire',
  'Carrefour la nation': 'Estuaire',
  'Carrefour la SGA': 'Estuaire',
  'Beau Lieu': 'Estuaire',
  'nkembo': 'Estuaire',
  'ubain martial ntoutoume obame': 'Estuaire',
  'joseph christian eyene obiang': 'Estuaire',
  'Venez voir': 'Estuaire',
  'soeur nyacinthe antine': 'Estuaire',
  // Ajoute d'autres si besoin
};

function getProvince(props) {
  return props['addr:province'] || CITY_TO_PROVINCE[props['addr:city']] || null;
}

function getAddress(props) {
  return [
    props['addr:housenumber'],
    props['addr:street'],
    props['addr:suburb'],
    props['addr:city'],
    props['addr:province'],
    props['addr:country']
  ].filter(Boolean).join(', ');
}

async function main() {
  const raw = fs.readFileSync(geojsonPath, 'utf-8');
  const data = JSON.parse(raw);

  let count = 0;
  for (const feature of data.features) {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const name = props.name || null;
    const type = props.amenity || null;
    const address = getAddress(props);
    const province = getProvince(props);
    const latitude = coords[1];
    const longitude = coords[0];
    if (!name || !type || !address) continue;
    try {
      await prisma.medicalLocation.create({
        data: {
          name,
          type,
          address,
          latitude,
          longitude,
          province,
        },
      });
      count++;
    } catch (e) {
      console.error('Erreur pour', name, e.message);
    }
  }
  console.log(`Import terminé ! ${count} établissements ajoutés.`);
  await prisma.$disconnect();
}

main(); 