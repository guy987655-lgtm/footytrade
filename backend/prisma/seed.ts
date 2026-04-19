import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLAYERS = [
  // ─── PREMIER LEAGUE ─────────────────────────────────────────────
  { name: 'Erling Haaland', position: 'Forward', team: 'Manchester City', league: 'Premier League', rating: 92, price: 450 },
  { name: 'Mohamed Salah', position: 'Forward', team: 'Liverpool', league: 'Premier League', rating: 88, price: 310 },
  { name: 'Bukayo Saka', position: 'Forward', team: 'Arsenal', league: 'Premier League', rating: 87, price: 320 },
  { name: 'Cole Palmer', position: 'Midfielder', team: 'Chelsea', league: 'Premier League', rating: 86, price: 330 },
  { name: 'Phil Foden', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 87, price: 300 },
  { name: 'Rodri', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 90, price: 340 },
  { name: 'Martin Ødegaard', position: 'Midfielder', team: 'Arsenal', league: 'Premier League', rating: 87, price: 310 },
  { name: 'Bruno Fernandes', position: 'Midfielder', team: 'Manchester United', league: 'Premier League', rating: 85, price: 250 },
  { name: 'Kevin De Bruyne', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 88, price: 280 },
  { name: 'Declan Rice', position: 'Midfielder', team: 'Arsenal', league: 'Premier League', rating: 85, price: 260 },
  { name: 'Alexander Isak', position: 'Forward', team: 'Newcastle', league: 'Premier League', rating: 85, price: 280 },
  { name: 'Son Heung-min', position: 'Forward', team: 'Tottenham', league: 'Premier League', rating: 84, price: 230 },
  { name: 'Marcus Rashford', position: 'Forward', team: 'Manchester United', league: 'Premier League', rating: 80, price: 180 },
  { name: 'Diogo Jota', position: 'Forward', team: 'Liverpool', league: 'Premier League', rating: 83, price: 220 },
  { name: 'Dominik Szoboszlai', position: 'Midfielder', team: 'Liverpool', league: 'Premier League', rating: 82, price: 210 },
  { name: 'Sandro Tonali', position: 'Midfielder', team: 'Newcastle', league: 'Premier League', rating: 82, price: 200 },
  { name: 'Bernardo Silva', position: 'Midfielder', team: 'Manchester City', league: 'Premier League', rating: 86, price: 260 },
  { name: 'Trent Alexander-Arnold', position: 'Defender', team: 'Liverpool', league: 'Premier League', rating: 84, price: 230 },
  { name: 'William Saliba', position: 'Defender', team: 'Arsenal', league: 'Premier League', rating: 85, price: 250 },
  { name: 'Virgil van Dijk', position: 'Defender', team: 'Liverpool', league: 'Premier League', rating: 86, price: 220 },
  { name: 'Rúben Dias', position: 'Defender', team: 'Manchester City', league: 'Premier League', rating: 85, price: 230 },
  { name: 'Alisson Becker', position: 'Goalkeeper', team: 'Liverpool', league: 'Premier League', rating: 87, price: 200 },
  { name: 'Ederson', position: 'Goalkeeper', team: 'Manchester City', league: 'Premier League', rating: 85, price: 180 },
  { name: 'David Raya', position: 'Goalkeeper', team: 'Arsenal', league: 'Premier League', rating: 84, price: 170 },
  { name: 'Ollie Watkins', position: 'Forward', team: 'Aston Villa', league: 'Premier League', rating: 83, price: 210 },
  { name: 'Jarrod Bowen', position: 'Forward', team: 'West Ham', league: 'Premier League', rating: 82, price: 190 },
  { name: 'Eberechi Eze', position: 'Midfielder', team: 'Crystal Palace', league: 'Premier League', rating: 82, price: 200 },
  { name: 'Moisés Caicedo', position: 'Midfielder', team: 'Chelsea', league: 'Premier League', rating: 82, price: 210 },
  { name: 'Gabriel Magalhães', position: 'Defender', team: 'Arsenal', league: 'Premier League', rating: 84, price: 220 },
  { name: 'Lisandro Martínez', position: 'Defender', team: 'Manchester United', league: 'Premier League', rating: 83, price: 200 },

  // ─── LA LIGA ─────────────────────────────────────────────────────
  { name: 'Kylian Mbappé', position: 'Forward', team: 'Real Madrid', league: 'La Liga', rating: 94, price: 480 },
  { name: 'Vinicius Jr', position: 'Forward', team: 'Real Madrid', league: 'La Liga', rating: 91, price: 420 },
  { name: 'Jude Bellingham', position: 'Midfielder', team: 'Real Madrid', league: 'La Liga', rating: 89, price: 380 },
  { name: 'Lamine Yamal', position: 'Forward', team: 'Barcelona', league: 'La Liga', rating: 86, price: 360 },
  { name: 'Robert Lewandowski', position: 'Forward', team: 'Barcelona', league: 'La Liga', rating: 87, price: 260 },
  { name: 'Pedri', position: 'Midfielder', team: 'Barcelona', league: 'La Liga', rating: 85, price: 270 },
  { name: 'Gavi', position: 'Midfielder', team: 'Barcelona', league: 'La Liga', rating: 82, price: 220 },
  { name: 'Federico Valverde', position: 'Midfielder', team: 'Real Madrid', league: 'La Liga', rating: 86, price: 280 },
  { name: 'Dani Olmo', position: 'Midfielder', team: 'Barcelona', league: 'La Liga', rating: 84, price: 260 },
  { name: 'Aurélien Tchouaméni', position: 'Midfielder', team: 'Real Madrid', league: 'La Liga', rating: 84, price: 240 },
  { name: 'Antonio Rüdiger', position: 'Defender', team: 'Real Madrid', league: 'La Liga', rating: 84, price: 200 },
  { name: 'Thibaut Courtois', position: 'Goalkeeper', team: 'Real Madrid', league: 'La Liga', rating: 86, price: 190 },
  { name: 'Marc-André ter Stegen', position: 'Goalkeeper', team: 'Barcelona', league: 'La Liga', rating: 85, price: 180 },
  { name: 'Nico Williams', position: 'Forward', team: 'Athletic Bilbao', league: 'La Liga', rating: 83, price: 240 },
  { name: 'João Cancelo', position: 'Defender', team: 'Barcelona', league: 'La Liga', rating: 83, price: 190 },
  { name: 'Jules Koundé', position: 'Defender', team: 'Barcelona', league: 'La Liga', rating: 84, price: 220 },
  { name: 'Raphinha', position: 'Forward', team: 'Barcelona', league: 'La Liga', rating: 84, price: 250 },
  { name: 'Antoine Griezmann', position: 'Forward', team: 'Atletico Madrid', league: 'La Liga', rating: 84, price: 220 },
  { name: 'Álvaro Morata', position: 'Forward', team: 'Atletico Madrid', league: 'La Liga', rating: 81, price: 170 },
  { name: 'Jan Oblak', position: 'Goalkeeper', team: 'Atletico Madrid', league: 'La Liga', rating: 86, price: 180 },
  { name: 'Alexander Sörloth', position: 'Forward', team: 'Atletico Madrid', league: 'La Liga', rating: 80, price: 160 },
  { name: 'Vinícius Júnior', position: 'Forward', team: 'Real Sociedad', league: 'La Liga', rating: 79, price: 140 },
  { name: 'Mikel Oyarzabal', position: 'Forward', team: 'Real Sociedad', league: 'La Liga', rating: 82, price: 190 },
  { name: 'Éder Militão', position: 'Defender', team: 'Real Madrid', league: 'La Liga', rating: 83, price: 210 },
  { name: 'Ronald Araújo', position: 'Defender', team: 'Barcelona', league: 'La Liga', rating: 84, price: 220 },

  // ─── BUNDESLIGA ──────────────────────────────────────────────────
  { name: 'Florian Wirtz', position: 'Midfielder', team: 'Bayer Leverkusen', league: 'Bundesliga', rating: 88, price: 350 },
  { name: 'Harry Kane', position: 'Forward', team: 'Bayern Munich', league: 'Bundesliga', rating: 88, price: 290 },
  { name: 'Jamal Musiala', position: 'Midfielder', team: 'Bayern Munich', league: 'Bundesliga', rating: 86, price: 310 },
  { name: 'Xavi Simons', position: 'Midfielder', team: 'RB Leipzig', league: 'Bundesliga', rating: 82, price: 230 },
  { name: 'Alejandro Grimaldo', position: 'Defender', team: 'Bayer Leverkusen', league: 'Bundesliga', rating: 84, price: 200 },
  { name: 'Leroy Sané', position: 'Forward', team: 'Bayern Munich', league: 'Bundesliga', rating: 83, price: 210 },
  { name: 'Serge Gnabry', position: 'Forward', team: 'Bayern Munich', league: 'Bundesliga', rating: 81, price: 180 },
  { name: 'Thomas Müller', position: 'Forward', team: 'Bayern Munich', league: 'Bundesliga', rating: 82, price: 170 },
  { name: 'Joshua Kimmich', position: 'Midfielder', team: 'Bayern Munich', league: 'Bundesliga', rating: 86, price: 250 },
  { name: 'Alphonso Davies', position: 'Defender', team: 'Bayern Munich', league: 'Bundesliga', rating: 83, price: 200 },
  { name: 'Dayot Upamecano', position: 'Defender', team: 'Bayern Munich', league: 'Bundesliga', rating: 82, price: 190 },
  { name: 'Kim Min-jae', position: 'Defender', team: 'Bayern Munich', league: 'Bundesliga', rating: 83, price: 200 },
  { name: 'Manuel Neuer', position: 'Goalkeeper', team: 'Bayern Munich', league: 'Bundesliga', rating: 85, price: 160 },
  { name: 'Gregor Kobel', position: 'Goalkeeper', team: 'Borussia Dortmund', league: 'Bundesliga', rating: 84, price: 170 },
  { name: 'Donyell Malen', position: 'Forward', team: 'Borussia Dortmund', league: 'Bundesliga', rating: 81, price: 180 },
  { name: 'Marcel Sabitzer', position: 'Midfielder', team: 'Borussia Dortmund', league: 'Bundesliga', rating: 81, price: 170 },
  { name: 'Nico Schlotterbeck', position: 'Defender', team: 'Borussia Dortmund', league: 'Bundesliga', rating: 82, price: 180 },
  { name: 'Jonathan Tah', position: 'Defender', team: 'Bayer Leverkusen', league: 'Bundesliga', rating: 83, price: 190 },
  { name: 'Granit Xhaka', position: 'Midfielder', team: 'Bayer Leverkusen', league: 'Bundesliga', rating: 84, price: 210 },
  { name: 'Loïs Openda', position: 'Forward', team: 'RB Leipzig', league: 'Bundesliga', rating: 82, price: 200 },
  { name: 'Benjamin Šeško', position: 'Forward', team: 'RB Leipzig', league: 'Bundesliga', rating: 81, price: 210 },
  { name: 'Vincenzo Grifo', position: 'Midfielder', team: 'Freiburg', league: 'Bundesliga', rating: 80, price: 150 },
  { name: 'Deniz Undav', position: 'Forward', team: 'Stuttgart', league: 'Bundesliga', rating: 80, price: 160 },
  { name: 'Chris Führich', position: 'Midfielder', team: 'Stuttgart', league: 'Bundesliga', rating: 79, price: 140 },
  { name: 'Serhou Guirassy', position: 'Forward', team: 'Borussia Dortmund', league: 'Bundesliga', rating: 82, price: 200 },

  // ─── SERIE A ─────────────────────────────────────────────────────
  { name: 'Lautaro Martínez', position: 'Forward', team: 'Inter Milan', league: 'Serie A', rating: 87, price: 290 },
  { name: 'Rafael Leão', position: 'Forward', team: 'AC Milan', league: 'Serie A', rating: 84, price: 250 },
  { name: 'Mike Maignan', position: 'Goalkeeper', team: 'AC Milan', league: 'Serie A', rating: 85, price: 180 },
  { name: 'Nicolò Barella', position: 'Midfielder', team: 'Inter Milan', league: 'Serie A', rating: 86, price: 270 },
  { name: 'Hakan Çalhanoğlu', position: 'Midfielder', team: 'Inter Milan', league: 'Serie A', rating: 84, price: 220 },
  { name: 'Federico Chiesa', position: 'Forward', team: 'Juventus', league: 'Serie A', rating: 80, price: 170 },
  { name: 'Dušan Vlahović', position: 'Forward', team: 'Juventus', league: 'Serie A', rating: 83, price: 220 },
  { name: 'Paulo Dybala', position: 'Forward', team: 'Roma', league: 'Serie A', rating: 83, price: 200 },
  { name: 'Romelu Lukaku', position: 'Forward', team: 'Napoli', league: 'Serie A', rating: 80, price: 160 },
  { name: 'Victor Osimhen', position: 'Forward', team: 'Napoli', league: 'Serie A', rating: 86, price: 280 },
  { name: 'Khvicha Kvaratskhelia', position: 'Forward', team: 'Napoli', league: 'Serie A', rating: 84, price: 260 },
  { name: 'Alessandro Bastoni', position: 'Defender', team: 'Inter Milan', league: 'Serie A', rating: 85, price: 230 },
  { name: 'Theo Hernández', position: 'Defender', team: 'AC Milan', league: 'Serie A', rating: 84, price: 210 },
  { name: 'Bremer', position: 'Defender', team: 'Juventus', league: 'Serie A', rating: 83, price: 200 },
  { name: 'Gleison Bremer', position: 'Defender', team: 'Juventus', league: 'Serie A', rating: 83, price: 190 },
  { name: 'Gianluigi Donnarumma', position: 'Goalkeeper', team: 'PSG / Italy', league: 'Serie A', rating: 84, price: 170 },
  { name: 'Ademola Lookman', position: 'Forward', team: 'Atalanta', league: 'Serie A', rating: 82, price: 200 },
  { name: 'Gianluca Scamacca', position: 'Forward', team: 'Atalanta', league: 'Serie A', rating: 80, price: 170 },
  { name: 'Matteo Politano', position: 'Forward', team: 'Napoli', league: 'Serie A', rating: 80, price: 150 },
  { name: 'Federico Dimarco', position: 'Defender', team: 'Inter Milan', league: 'Serie A', rating: 83, price: 200 },
  { name: 'Manuel Locatelli', position: 'Midfielder', team: 'Juventus', league: 'Serie A', rating: 81, price: 170 },
  { name: 'Davide Frattesi', position: 'Midfielder', team: 'Inter Milan', league: 'Serie A', rating: 80, price: 160 },
  { name: 'Andrea Colpani', position: 'Midfielder', team: 'Fiorentina', league: 'Serie A', rating: 79, price: 140 },
  { name: 'Marcus Thuram', position: 'Forward', team: 'Inter Milan', league: 'Serie A', rating: 83, price: 220 },
  { name: 'Yann Sommer', position: 'Goalkeeper', team: 'Inter Milan', league: 'Serie A', rating: 83, price: 150 },

  // ─── LIGUE 1 ─────────────────────────────────────────────────────
  { name: 'Ousmane Dembélé', position: 'Forward', team: 'PSG', league: 'Ligue 1', rating: 83, price: 230 },
  { name: 'Achraf Hakimi', position: 'Defender', team: 'PSG', league: 'Ligue 1', rating: 84, price: 210 },
  { name: 'Marquinhos', position: 'Defender', team: 'PSG', league: 'Ligue 1', rating: 84, price: 200 },
  { name: 'Vitinha', position: 'Midfielder', team: 'PSG', league: 'Ligue 1', rating: 83, price: 210 },
  { name: 'Warren Zaïre-Emery', position: 'Midfielder', team: 'PSG', league: 'Ligue 1', rating: 80, price: 190 },
  { name: 'Gianluigi Donnarumma', position: 'Goalkeeper', team: 'PSG', league: 'Ligue 1', rating: 84, price: 170 },
  { name: 'Bradley Barcola', position: 'Forward', team: 'PSG', league: 'Ligue 1', rating: 80, price: 180 },
  { name: 'Alexandre Lacazette', position: 'Forward', team: 'Lyon', league: 'Ligue 1', rating: 80, price: 150 },
  { name: 'Rayan Cherki', position: 'Forward', team: 'Lyon', league: 'Ligue 1', rating: 79, price: 160 },
  { name: 'Jonathan David', position: 'Forward', team: 'Lille', league: 'Ligue 1', rating: 82, price: 200 },
  { name: 'Wahi Elye', position: 'Forward', team: 'Marseille', league: 'Ligue 1', rating: 78, price: 140 },
  { name: 'Pierre-Emerick Aubameyang', position: 'Forward', team: 'Marseille', league: 'Ligue 1', rating: 80, price: 160 },
  { name: 'Amine Harit', position: 'Midfielder', team: 'Marseille', league: 'Ligue 1', rating: 78, price: 130 },
  { name: 'Chancel Mbemba', position: 'Defender', team: 'Marseille', league: 'Ligue 1', rating: 79, price: 140 },
  { name: 'Mohamed-Ali Cho', position: 'Forward', team: 'Nice', league: 'Ligue 1', rating: 77, price: 120 },
  { name: 'Khéphren Thuram', position: 'Midfielder', team: 'Nice', league: 'Ligue 1', rating: 79, price: 150 },
  { name: 'Youssouf Fofana', position: 'Midfielder', team: 'Monaco', league: 'Ligue 1', rating: 81, price: 180 },
  { name: 'Wissam Ben Yedder', position: 'Forward', team: 'Monaco', league: 'Ligue 1', rating: 81, price: 170 },
  { name: 'Folarin Balogun', position: 'Forward', team: 'Monaco', league: 'Ligue 1', rating: 79, price: 150 },
  { name: 'Nuno Mendes', position: 'Defender', team: 'PSG', league: 'Ligue 1', rating: 82, price: 190 },
  { name: 'Lucas Hernández', position: 'Defender', team: 'PSG', league: 'Ligue 1', rating: 83, price: 200 },
  { name: 'Gonçalo Ramos', position: 'Forward', team: 'PSG', league: 'Ligue 1', rating: 81, price: 180 },
  { name: 'Randal Kolo Muani', position: 'Forward', team: 'PSG', league: 'Ligue 1', rating: 80, price: 170 },
  { name: 'Téji Savanier', position: 'Midfielder', team: 'Montpellier', league: 'Ligue 1', rating: 79, price: 130 },
  { name: 'Lee Kang-in', position: 'Midfielder', team: 'PSG', league: 'Ligue 1', rating: 80, price: 170 },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data in correct order (foreign key constraints)
  await prisma.watchlistItem.deleteMany();
  await prisma.referralBonus.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.playerStats.deleteMany();
  await prisma.player.deleteMany();
  console.log('Cleared existing player data.');

  // Seed admin settings
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

  for (let i = 0; i < PLAYERS.length; i++) {
    const p = PLAYERS[i];
    const player = await prisma.player.create({
      data: {
        externalId: i + 1,
        name: p.name,
        position: p.position,
        team: p.team,
        league: p.league,
        footyRating: p.rating,
        currentPrice: p.price,
        totalShares: 1000,
      },
    });

    // Generate 30 days of price history
    const now = new Date();
    for (let d = 30; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const variance = (Math.random() - 0.5) * p.price * 0.08;
      await prisma.priceHistory.create({
        data: {
          playerId: player.id,
          price: Math.max(10, Math.round((p.price + variance) * 100) / 100),
          timestamp: date,
        },
      });
    }
  }

  console.log(`Seeded ${PLAYERS.length} players across 5 leagues with 30-day price history.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
