import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Suppression de la création des utilisateurs et profils de test ---
// (tout le bloc de création de testUser, testMedecin, testPatientUser, testPatient est supprimé)

// --- MIGRATION : mise à jour des provinces manquantes ---
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

async function updateProvinces() {
  const locations = await prisma.medicalLocation.findMany();
  let updated = 0;
  for (const loc of locations) {
    if (!loc.province && loc.address) {
      // On tente d'extraire la ville de l'adresse
      const found = Object.keys(CITY_TO_PROVINCE).find(city => loc.address.includes(city));
      if (found) {
        await prisma.medicalLocation.update({
          where: { id: loc.id },
          data: { province: CITY_TO_PROVINCE[found] }
        });
        updated++;
      }
    }
  }
  console.log(`Migration : ${updated} établissements mis à jour avec la province.`);
}

// --- OUTIL DE DIAGNOSTIC : lister les établissements sans province ---
async function listLocationsWithoutProvince() {
  const locations = await prisma.medicalLocation.findMany({ where: { province: null } });
  if (locations.length === 0) {
    console.log('Tous les établissements ont une province.');
    return;
  }
  console.log('Établissements sans province :');
  for (const loc of locations) {
    console.log(`ID: ${loc.id} | Nom: ${loc.name} | Adresse: ${loc.address}`);
  }
  console.log(`Total: ${locations.length} établissements sans province.`);
}

// --- OUTIL DE DIAGNOSTIC : lister tous les types et provinces distincts ---
async function listTypesAndProvinces() {
  const types = await prisma.medicalLocation.findMany({
    select: { type: true, province: true },
    where: { province: { not: null } }
  });
  const typeSet = new Set();
  const provinceSet = new Set();
  for (const loc of types) {
    if (loc.type) typeSet.add(loc.type.trim().toUpperCase());
    if (loc.province) provinceSet.add(loc.province.trim());
  }
  console.log('Types trouvés :');
  for (const t of typeSet) console.log('-', t);
  console.log('\nProvinces trouvées :');
  for (const p of provinceSet) console.log('-', p);
}

// --- OUTIL DE DIAGNOSTIC : compter les établissements par province ---
async function countLocationsByProvince() {
  const locations = await prisma.medicalLocation.findMany({ select: { province: true } });
  const counts = {};
  for (const loc of locations) {
    const province = (loc.province || 'INCONNUE').trim();
    counts[province] = (counts[province] || 0) + 1;
  }
  console.log('Nombre d\'établissements par province :');
  for (const [province, count] of Object.entries(counts)) {
    console.log(`- ${province} : ${count}`);
  }
}

// Pour exécuter ce diagnostic seul :
if (process.argv.includes('--list-null-province')) {
  listLocationsWithoutProvince().then(() => prisma.$disconnect());
}

if (process.argv.includes('--list-types-provinces')) {
  listTypesAndProvinces().then(() => prisma.$disconnect());
}

if (process.argv.includes('--count-by-province')) {
  countLocationsByProvince().then(() => prisma.$disconnect());
}

// Appel de la migration à la fin du seeding
updateProvinces()
  .catch((e) => {
    console.error('❌ Erreur lors de la migration des provinces:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 