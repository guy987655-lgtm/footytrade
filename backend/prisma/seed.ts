import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLAYERS = [
  { name: 'Erling Haaland', position: 'Forward', team: 'Manchester City', league: 'Premier League', rating: 92, price: 450 },
  { name: 'Kylian Mbappé', position: 'Forward', team: 'Real Madrid', league: 'La Liga', rating: 94, price: 480 },
  { name: 'Vinicius Jr', position: 'Forward', team: 'Real Madrid', league: 'La Liga', rating: 91, price: 420 },
  { name: 'Jude Bellingham', position: 'Midfielder', team: 'Real Madrid', league: 'La Liga', rating: 89, price: 380 },
  { name: 'Rodri', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 90, price: 340 },
  { name: 'Mohamed Salah', position: 'Forward', team: 'Liverpool', league: 'Premier League', rating: 88, price: 310 },
  { name: 'Bukayo Saka', position: 'Forward', team: 'Arsenal', league: 'Premier League', rating: 87, price: 320 },
  { name: 'Phil Foden', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 87, price: 300 },
  { name: 'Florian Wirtz', position: 'Midfielder', team: 'Bayer Leverkusen', league: 'Bundesliga', rating: 88, price: 350 },
  { name: 'Lamine Yamal', position: 'Forward', team: 'Barcelona', league: 'La Liga', rating: 86, price: 360 },
  { name: 'Robert Lewandowski', position: 'Forward', team: 'Barcelona', league: 'La Liga', rating: 87, price: 260 },
  { name: 'Harry Kane', position: 'Forward', team: 'Bayern Munich', league: 'Bundesliga', rating: 88, price: 290 },
  { name: 'Martin Ødegaard', position: 'Midfielder', team: 'Arsenal', league: 'Premier League', rating: 87, price: 310 },
  { name: 'Bruno Fernandes', position: 'Midfielder', team: 'Manchester United', league: 'Premier League', rating: 85, price: 250 },
  { name: 'Kevin De Bruyne', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 88, price: 280 },
  { name: 'Cole Palmer', position: 'Midfielder', team: 'Chelsea', league: 'Premier League', rating: 86, price: 330 },
  { name: 'Pedri', position: 'Midfielder', team: 'Barcelona', league: 'La Liga', rating: 85, price: 270 },
  { name: 'Gavi', position: 'Midfielder', team: 'Barcelona', league: 'La Liga', rating: 82, price: 220 },
  { name: 'Jamal Musiala', position: 'Midfielder', team: 'Bayern Munich', league: 'Bundesliga', rating: 86, price: 310 },
  { name: 'Declan Rice', position: 'Midfielder', team: 'Arsenal', league: 'Premier League', rating: 85, price: 260 },
  { name: 'Federico Valverde', position: 'Midfielder', team: 'Real Madrid', league: 'La Liga', rating: 86, price: 280 },
  { name: 'Trent Alexander-Arnold', position: 'Defender', team: 'Liverpool', league: 'Premier League', rating: 84, price: 230 },
  { name: 'William Saliba', position: 'Defender', team: 'Arsenal', league: 'Premier League', rating: 85, price: 250 },
  { name: 'Virgil van Dijk', position: 'Defender', team: 'Liverpool', league: 'Premier League', rating: 86, price: 220 },
  { name: 'Rúben Dias', position: 'Defender', team: 'Manchester City', league: 'Premier League', rating: 85, price: 230 },
  { name: 'Antonio Rüdiger', position: 'Defender', team: 'Real Madrid', league: 'La Liga', rating: 84, price: 200 },
  { name: 'Alisson Becker', position: 'Goalkeeper', team: 'Liverpool', league: 'Premier League', rating: 87, price: 200 },
  { name: 'Thibaut Courtois', position: 'Goalkeeper', team: 'Real Madrid', league: 'La Liga', rating: 86, price: 190 },
  { name: 'Victor Osimhen', position: 'Forward', team: 'Galatasaray', league: 'Süper Lig', rating: 86, price: 280 },
  { name: 'Khvicha Kvaratskhelia', position: 'Forward', team: 'PSG', league: 'Ligue 1', rating: 84, price: 260 },
  { name: 'Rafael Leão', position: 'Forward', team: 'AC Milan', league: 'Serie A', rating: 84, price: 250 },
  { name: 'Lautaro Martínez', position: 'Forward', team: 'Inter Milan', league: 'Serie A', rating: 87, price: 290 },
  { name: 'Bernardo Silva', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 86, price: 260 },
  { name: 'Ousmane Dembélé', position: 'Forward', team: 'PSG', league: 'Ligue 1', rating: 83, price: 230 },
  { name: 'Marcus Rashford', position: 'Forward', team: 'Manchester United', league: 'Premier League', rating: 80, price: 180 },
  { name: 'Diogo Jota', position: 'Forward', team: 'Liverpool', league: 'Premier League', rating: 83, price: 220 },
  { name: 'Dani Olmo', position: 'Midfielder', team: 'Barcelona', league: 'La Liga', rating: 84, price: 260 },
  { name: 'Alejandro Grimaldo', position: 'Defender', team: 'Bayer Leverkusen', league: 'Bundesliga', rating: 84, price: 200 },
  { name: 'Achraf Hakimi', position: 'Defender', team: 'PSG', league: 'Ligue 1', rating: 84, price: 210 },
  { name: 'João Cancelo', position: 'Defender', team: 'Barcelona', league: 'La Liga', rating: 83, price: 190 },
  { name: 'Nico Williams', position: 'Forward', team: 'Athletic Bilbao', league: 'La Liga', rating: 83, price: 240 },
  { name: 'Xavi Simons', position: 'Midfielder', team: 'RB Leipzig', league: 'Bundesliga', rating: 82, price: 230 },
  { name: 'Sandro Tonali', position: 'Midfielder', team: 'Newcastle', league: 'Premier League', rating: 82, price: 200 },
  { name: 'Alexander Isak', position: 'Forward', team: 'Newcastle', league: 'Premier League', rating: 85, price: 280 },
  { name: 'Son Heung-min', position: 'Forward', team: 'Tottenham', league: 'Premier League', rating: 84, price: 230 },
  { name: 'Dominik Szoboszlai', position: 'Midfielder', team: 'Liverpool', league: 'Premier League', rating: 82, price: 210 },
  { name: 'Aurélien Tchouaméni', position: 'Midfielder', team: 'Real Madrid', league: 'La Liga', rating: 84, price: 240 },
  { name: 'Marc-André ter Stegen', position: 'Goalkeeper', team: 'Barcelona', league: 'La Liga', rating: 85, price: 180 },
  { name: 'Mike Maignan', position: 'Goalkeeper', team: 'AC Milan', league: 'Serie A', rating: 85, price: 180 },
  { name: 'Ederson', position: 'Goalkeeper', team: 'Manchester City', league: 'Premier League', rating: 85, price: 180 },
];

async function main() {
  console.log('Seeding database...');

  await prisma.adminSetting.upsert({
    where: { key: 'feePercent' },
    update: {},
    create: { key: 'feePercent', value: '1.5' },
  });
  await prisma.adminSetting.upsert({
    where: { key: 'demandMultiplier' },
    update: {},
    create: { key: 'demandMultiplier', value: '1.0' },
  });
  await prisma.adminSetting.upsert({
    where: { key: 'marketMakerSpread' },
    update: {},
    create: { key: 'marketMakerSpread', value: '0.02' },
  });
  await prisma.adminSetting.upsert({
    where: { key: 'marketMakerEnabled' },
    update: {},
    create: { key: 'marketMakerEnabled', value: 'true' },
  });

  for (const p of PLAYERS) {
    const player = await prisma.player.upsert({
      where: { externalId: PLAYERS.indexOf(p) + 1 },
      update: {
        name: p.name,
        position: p.position,
        team: p.team,
        league: p.league,
        footyRating: p.rating,
        currentPrice: p.price,
      },
      create: {
        externalId: PLAYERS.indexOf(p) + 1,
        name: p.name,
        position: p.position,
        team: p.team,
        league: p.league,
        footyRating: p.rating,
        currentPrice: p.price,
        totalShares: 1000,
      },
    });

    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * p.price * 0.08;
      await prisma.priceHistory.create({
        data: {
          playerId: player.id,
          price: Math.max(10, p.price + variance),
          timestamp: date,
        },
      });
    }
  }

  console.log(`Seeded ${PLAYERS.length} players with price history and admin settings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
