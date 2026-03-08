const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'apitrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2012704'
});

// Nouveaux défauts visuels
const visualDefects = [
  { code: 'Aa', libelle: 'Gas inclusion', description: 'Gas bubbles trapped in the weld metal, porosity, weakening.' },
  { code: 'Ea', libelle: 'Crack', description: 'Fracture in the weld or base metal (longitudinal, transverse, crater).' },
  { code: 'W', libelle: 'Paint marking (US plan)', description: 'Visual marking applied with paint according to plan.' },
  { code: 'OS', libelle: 'Grinding of excess weld', description: 'Removal of weld reinforcement by grinding.' },
  { code: 'RBT', libelle: 'Splicing', description: 'Joint or connection between coil ends.' },
  { code: 'T1', libelle: 'First weld node', description: 'First spiral weld start point.' },
  { code: 'T2', libelle: 'Second weld node', description: 'Second spiral weld start point.' },
  { code: 'EF', libelle: 'Dent', description: 'Local deformation (indentation) in the pipe.' },
  { code: 'DDB', libelle: 'Lamination split', description: 'Separation of layers due to rolling defect.' },
  { code: 'FT', libelle: 'Lamination / Delamination', description: 'Stratification or splitting of the metal.' },
  { code: 'GB', libelle: 'Coil scratch', description: 'Scratch caused by the coil.' },
  { code: 'GM', libelle: 'Machine scratch', description: 'Scratch caused by the machine.' },
  { code: 'MB', libelle: 'Coil marking', description: 'Marks left by the coil.' },
  { code: 'MM', libelle: 'Machine marking', description: 'Marks left by the machine.' },
  { code: 'F', libelle: 'Gutter-like defect', description: 'A longitudinal depression or groove on the surface, often caused by improper material flow during casting or rolling.' },
  { code: 'ND', libelle: 'Unevenness / level difference', description: 'A mismatch in height or thickness between adjacent areas, typically due to misalignment in molds or rolling equipment.' },
  { code: 'PRC', libelle: 'Shrinkage cavity in chain', description: 'A series of connected voids formed by solidification shrinkage, usually appearing along a line inside the material.' },
  { code: 'PRS', libelle: 'Surface shrinkage cavity', description: 'A visible cavity on the surface caused by localized shrinkage during cooling, weakening the external layer.' },
  { code: 'R', libelle: 'Surface blowhole cluster', description: 'Small gas pockets grouped together on the surface, often from trapped air or gas during solidification.' },
  { code: 'Y', libelle: 'Internal interruption', description: 'A discontinuity inside the material, such as incomplete fusion or internal cracks, reducing structural integrity.' },
  { code: 'E', libelle: 'External interruption', description: 'A break or discontinuity visible on the outer surface, often from incomplete joining or external cracking.' },
  { code: 'EY', libelle: 'Internal and external interruption', description: 'A defect that extends through both internal and external layers, indicating severe discontinuity.' },
  { code: 'SP', libelle: 'Pierced weld', description: 'A weld with through-holes or porosity, compromising strength and sealing properties.' },
  { code: 'C', libelle: 'Cold weld / adhesion defect', description: 'Poor bonding between surfaces due to insufficient heat or pressure, leading to weak joints.' },
  { code: 'SI', libelle: 'Weld in chain links', description: 'A weld showing repetitive link-like patterns, often from inconsistent welding cycles or improper overlap.' },
  { code: 'SCVE', libelle: 'Concave weld', description: 'A weld bead with a sunken profile, indicating insufficient filler material or poor technique, reducing load-bearing capacity.' },
  { code: 'SCXE', libelle: 'Convex weld', description: 'A weld bead that protrudes excessively outward, forming a convex shape. This can reduce mechanical strength and cause stress concentration.' },
  { code: 'SD', libelle: 'Misaligned weld', description: 'The weld is not centered on the joint line, leading to poor fusion and uneven load distribution.' },
  { code: 'B', libelle: 'Local cracks, burr', description: 'Small fractures or surface cracks in the material, or burrs left after cutting/machining.' },
  { code: 'OV', libelle: 'Ovalization', description: 'The tube or pipe loses its circular shape and becomes oval. This can affect fit-up, sealing, and pressure resistance.' },
  { code: 'ORT', libelle: 'Squareness of tube ends', description: 'Tube ends are not cut perpendicular to the axis, leading to poor fit-up during welding or assembly.' },
  { code: 'Rect', libelle: 'Straightness', description: 'The tube is bent or deviates from a straight axis. Lack of straightness can complicate installation.' },
  { code: 'OXF', libelle: 'Foil Oxidation', description: 'Oxidation (rusting or corrosion) on thin sheet metal or foil surfaces.' },
  { code: 'AMC', libelle: 'Initiation (any type)', description: 'The start of a defect or crack. Indicates the presence of a localized initiation point, such as a micro-crack.' },
  { code: 'DT', libelle: 'Sheet Deformation', description: 'Unwanted bending, warping, or distortion of sheet metal from improper handling or excessive mechanical stress.' },
  { code: 'DDBRV', libelle: 'Edge Splitting/Doubling', description: 'A defect at the sheet edge where the material splits or layers separate during rolling, cutting, or forming.' }
];

// Nouveaux défauts NDT
const ndtDefects = [
  { code: 'R1', libelle: 'Good film', description: 'Radiographic film shows no anomalies; weld appears sound.' },
  { code: 'R2', libelle: 'Film to redo', description: 'Film quality insufficient (poor exposure, density, or contrast). Requires retaking.' },
  { code: 'R4 D0', libelle: 'Blowhole (bubbles)', description: 'Small gas cavity in weld metal. May be acceptable depending on size and distribution.' },
  { code: 'R5 D0', libelle: 'Grooves', description: 'Surface irregularities or undercut at weld toe. At low severity (D0), considered acceptable.' },
  { code: 'R7 D0', libelle: 'Misalignment', description: 'Slight offset between tube edges. Within tolerance at D0 level.' },
  { code: 'R4 D2', libelle: 'Blowholes (bubbles)', description: 'Larger or clustered gas cavities. Can compromise mechanical strength.' },
  { code: 'R3 D2', libelle: 'Lack of penetration/fusion', description: 'Incomplete bonding between weld passes or base metal. Serious defect affecting structural integrity.' },
  { code: 'R5 D2', libelle: 'Grooves', description: 'Severe undercut or groove formation. Weakens tube wall thickness.' },
  { code: 'R6 D2', libelle: 'Cracks', description: 'Fractures in weld or base metal. Critical defect; leads to immediate rejection.' },
  { code: 'R7 D2', libelle: 'Misalignment', description: 'Significant offset between tube edges. May affect assembly and structural performance.' }
];

async function replaceDefauts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Désactiver tous les défauts existants
    const deactivateResult = await client.query(`
      UPDATE defauts SET actif = false WHERE actif = true
    `);
    console.log(`✓ ${deactivateResult.rowCount} défauts existants désactivés`);
    
    // 2. Insérer les nouveaux défauts visuels
    let insertedVisual = 0;
    for (const defect of visualDefects) {
      await client.query(`
        INSERT INTO defauts (code, libelle, description, actif)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (code) DO UPDATE SET
          libelle = EXCLUDED.libelle,
          description = EXCLUDED.description,
          actif = true
      `, [defect.code, defect.libelle, defect.description]);
      insertedVisual++;
    }
    console.log(`✓ ${insertedVisual} défauts visuels insérés/mis à jour`);
    
    // 3. Insérer les nouveaux défauts NDT
    let insertedNDT = 0;
    for (const defect of ndtDefects) {
      await client.query(`
        INSERT INTO defauts (code, libelle, description, actif)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (code) DO UPDATE SET
          libelle = EXCLUDED.libelle,
          description = EXCLUDED.description,
          actif = true
      `, [defect.code, defect.libelle, defect.description]);
      insertedNDT++;
    }
    console.log(`✓ ${insertedNDT} défauts NDT insérés/mis à jour`);
    
    await client.query('COMMIT');
    
    // Vérifier le total des défauts actifs
    const countResult = await client.query(`SELECT COUNT(*) FROM defauts WHERE actif = true`);
    console.log(`\n✅ Total: ${countResult.rows[0].count} défauts actifs (${insertedVisual} visuels + ${insertedNDT} NDT)`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

replaceDefauts().catch(console.error);
