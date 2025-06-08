import axios from 'axios';
import admin from 'firebase-admin';

const now = new Date();
const pauseUntil = new Date('2025-07-01T12:00:00Z'); // Change to your desired resume date
console.log(`🕒 Current time: ${now.toISOString()}`);

if (now < pauseUntil) {
  console.log(`⏸️  Upload paused until ${pauseUntil.toISOString().split('T')[0]}`);
  process.exit(0);
}

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


const extractOrganization = (url) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() +
           hostname.replace('www.', '').split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
};

const uploadContests = async () => {
  try {
    const { data } = await axios.get('https://kytalist-cp-backend.vercel.app/api');
    let uploaded = 0;

  for (const contest of data) {
  const dateStr = new Date(contest.start).toISOString().split('T')[0];
    const existing = await db.collection('olympiads')
      .where('name', '==', contest.name)
      .where('date', '==', dateStr)
      .get();

    if (!existing.empty) {
      console.log(`Skipping duplicate: ${contest.name}`);
      continue;
    }

    await db.collection('olympiads').add({
      date: dateStr,
      name: contest.name,
      organization: extractOrganization(contest.url),
      link: contest.url,
      type: 'Online',
      category: ['Competitive Programming']
    });

    uploaded++;
  }


    console.log(`${uploaded} new contests uploaded.`);
  } catch (err) {
    console.error('Upload failed:', err);
  }
};

uploadContests();
