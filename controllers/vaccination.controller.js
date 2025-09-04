const { MongoClient } = require('mongodb');
const fs = require('fs');
const url = require('url');
const path = require('path');

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB || 'prsdb';
const collectionName = 'vaccinations';

// Utility to extract immunization + patient from FHIR JSON
function extractVaccinationRecords(fhirJson, prs_id) {
  // Find the Patient object first
  let patientEntry = fhirJson.entry.find(e => e.resource.resourceType === 'Patient');
  const nhs_number = patientEntry?.resource?.identifier?.[0]?.value || '';
  const birth_date = patientEntry?.resource?.birthDate || '';

  // Immunization entries
  const immunizationEntries = fhirJson.entry.filter(e => e.resource.resourceType === 'Immunization');

  return immunizationEntries.map(entry => {
    const res = entry.resource;
    return {
      prs_id: prs_id, 
      nhs_number,
      birth_date,
      vaccine_code: res.vaccineCode?.coding?.[0]?.code || '',
      vaccine_name: res.vaccineCode?.coding?.[0]?.display || '',
      dose_number: res.protocolApplied?.[0]?.doseNumberPositiveInt || '',
      date_administered: res.occurrenceDateTime || '',
      provider: res.performer?.[0]?.actor?.display || '',
      lot_number: res.lotNumber || '',
      expiration_date: res.expirationDate || '',
      site: res.site?.coding?.[0]?.display || '',
      route: res.route?.coding?.[0]?.display || '',
      reason_code: res.reasonCode?.[0]?.coding?.[0]?.display || '',
      location: res.location?.identifier?.value || '',
      raw_fhir: res 
    };
  });
}

// Controller: Handle Vaccination Upload (for POST /api/vaccinations/upload)
async function handleVaccinationUpload(req, res) {
  
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 405, message: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { prs_id, fhir_json } = JSON.parse(body);
      if (!prs_id || !fhir_json) throw new Error('Missing prs_id or FHIR JSON');

      if (fhir_json.resourceType !== 'Bundle') throw new Error('Invalid FHIR bundle');

      const records = extractVaccinationRecords(fhir_json, prs_id);

      const client = await MongoClient.connect(mongoUrl, { useUnifiedTopology: true });
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      await collection.insertMany(records);

      client.close();

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 201, message: 'Vaccination records saved', count: records.length }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 400, message: err.message }));
    }
  });
}

module.exports = { handleVaccinationUpload, extractVaccinationRecords };
