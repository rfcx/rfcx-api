const { randomGuid } = require('../../common/crypto/random')

const names = [
  'Safa Ramsey',
  'Gene Klein',
  'Liana Arnold',
  'Nellie Little',
  'Moshe Stokes',
  'Magnus Santos',
  'Annabelle Tyler',
  'Lucia Bell',
  'Khadija Massey',
  'Chanel Brady',
  'Ibraheem Graves',
  'Leland Gallagher',
  'Youssef Cross',
  'Dan Davies',
  'Huw West',
  'Sebastian Conley',
  'Delilah Grant',
  'Mehmet Hendrix',
  'Saoirse Castaneda',
  'Laila Day',
  'Carla Snyder',
  'Nannie Glover',
  'Kaden Pugh',
  'Bartosz Cochran',
  'Gideon Olsen',
  'Aleksander Schmidt',
  'Estelle Gonzales',
  'Neha Glenn',
  'Raymond Davidson',
  'Belle Rodriguez',
  'Yasmine Moran',
  'Kabir Bender',
  'Safiya Delacruz',
  'Otto Duncan',
  'Jessica Hooper',
  'April Baldwin',
  'Lilli Mullen',
  'Jermaine Bush',
  'Lorraine Mayer',
  'Liam Mosley',
  'Kobi Pearson',
  'Kareem Huff',
  'Edith Knox',
  'Grayson Curtis',
  'Damon Mcconnell',
  'Morgan Mcdonald',
  'Hasan Irwin',
  'Daniyal Howell',
  'Kaitlyn Armstrong',
  'Shauna Li',
  'Katerina Greer',
  'Clara Walls',
  'Azaan Connor',
  'Jasmine Sullivan',
  'Steve Rowe',
  'Larry Cortez',
  'Cade Morton',
  'Flora Hoffman',
  'Astrid Obrien',
  'Xanthe Cain',
  'Paige Cardenas',
  'Lyla Chandler',
  'Aliyah Brown',
  'Riley Hansen',
  'Eshal Floyd',
  'Maximilian Brandt',
  'Rex Bass',
  'Katrina Randall',
  'Joel Colon',
  'Wiktor Hunter',
  'Sasha Clarke',
  'Floyd Franklin',
  'Kye Morales',
  'Conrad Buck',
  'Eleri Gibbs',
  'Zane Mckay',
  'Angel Gilbert',
  'Daisie Fields',
  'Susan Chapman',
  'Chanelle Bauer',
  'Ashley Powell',
  'Roman Mathis',
  'Sofia Morrison',
  'James Dale',
  'Karl Daugherty',
  'Joanne Francis',
  'Corey Charles',
  'Jakub Sanchez',
  'Luke Osborn',
  'Seren Sandoval',
  'Lucas Mcdaniel',
  'Aleeza Chang',
  'Bronte Pace',
  'Brooklyn Woods',
  'Jenna Butler',
  'Caoimhe White',
  'Maisy Lucero',
  'Mohammed Melendez',
  'Kyle Gould',
  'Seth Todd'
]

async function generateUsers (models) {
  const data = names.map(n => {
    return {
      guid: randomGuid(),
      firstname: n.split(' ')[0],
      lastname: n.split(' ')[1],
      email: n.toLowerCase().replace(' ', '@') + '.com'
    }
  })
  for (const user of data) {
    const row = (await models.User.findOrCreate({ where: { email: user.email }, defaults: user }))[0]
    user.id = row.id
  }
  console.log(`Created ${data.length} users`)
  return data
}

module.exports = {
  generateUsers
}
