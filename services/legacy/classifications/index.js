const mappings = { // grabbed from Prediction Service
  whale: 'orcinus_orca',
  humpback: 'megaptera_novaeangliae',
  orca: 'orcinus_orca',
  orca_call: 'orcinus_orca_call',
  orca_echolocation: 'orcinus_orca_echolocation',
  spider_monkey_generic: 'ateles_geoffroyi'
}

function mapClassification (classification) {
  return mappings[classification] || classification
}

function mapClassifications (classifications) {
  return classifications.map(mapClassification)
}

module.exports = {
  mapClassification,
  mapClassifications
}
