export const SONG_LIBRARY = [
  // Beethoven
  "Für Elise – Beethoven",
  "Moonlight Sonata Op. 27 No. 2 (1st movement) – Beethoven",
  "Moonlight Sonata Op. 27 No. 2 (3rd movement) – Beethoven",
  "Ode to Joy – Beethoven",
  "Pathétique Sonata (2nd movement) – Beethoven",
  "Für Elise (full) – Beethoven",
  // Mozart
  "Rondo Alla Turca – Mozart",
  "Sonata in C Major K. 545 – Mozart",
  "Eine Kleine Nachtmusik – Mozart",
  // Chopin
  "Nocturne Op. 9 No. 2 – Chopin",
  "Nocturne Op. 20 in C# minor – Chopin",
  "Waltz in A minor B. 150 – Chopin",
  "Fantasie Impromptu – Chopin",
  "Ballade No. 1 – Chopin",
  "Prelude Op. 28 No. 4 – Chopin",
  "Raindrop Prelude – Chopin",
  // Debussy
  "Clair de Lune – Debussy",
  "Arabesque No. 1 – Debussy",
  "La Fille aux Cheveux de Lin – Debussy",
  // Satie
  "Gymnopédie No. 1 – Satie",
  "Gymnopédie No. 2 – Satie",
  "Gymnopédie No. 3 – Satie",
  "Gnossiennes No. 1 – Satie",
  // Bach
  "Prelude in C Major BWV 846 – Bach",
  "Invention No. 1 in C Major – Bach",
  "Minuet in G Major BWV Anh. 114 – Bach",
  "Toccata and Fugue in D minor – Bach",
  "Jesu Joy of Man's Desiring – Bach",
  // Pachelbel
  "Canon in D – Pachelbel",
  // Yiruma / Modern
  "River Flows in You – Yiruma",
  "Kiss the Rain – Yiruma",
  "Maybe – Yiruma",
  // Einaudi
  "Una Mattina – Einaudi",
  "Experience – Einaudi",
  "Nuvole Bianche – Einaudi",
  "Le Onde – Einaudi",
  // Schubert
  "Ave Maria – Schubert",
  "Serenade (Ständchen) – Schubert",
  // Liszt
  "Liebestraum No. 3 – Liszt",
  "Hungarian Rhapsody No. 2 – Liszt",
  "La Campanella – Liszt",
  // Schumann
  "Träumerei – Schumann",
  "The Wild Horseman – Schumann",
  // Brahms
  "Lullaby (Wiegenlied) – Brahms",
  "Intermezzo Op. 118 No. 2 – Brahms",
  // Tchaikovsky
  "Swan Lake Theme – Tchaikovsky",
  "The Nutcracker Suite – Tchaikovsky",
  "Piano Concerto No. 1 (opening theme) – Tchaikovsky",
  // Grieg
  "In the Hall of the Mountain King – Grieg",
  "Morning Mood – Grieg",
  // Other popular
  "Comptine d'un autre été – Tiersen",
  "Heart and Soul – Hoagy Carmichael",
  "Bohemian Rhapsody – Queen",
  "Someone Like You – Adele",
  "Let It Be – The Beatles",
  "Imagine – John Lennon",
  "Clocks – Coldplay",
  "The Scientist – Coldplay",
  "Hallelujah – Leonard Cohen",
];

export const EXAMPLE_SONGS = [
  "Für Elise – Beethoven",
  "Moonlight Sonata Op. 27 No. 2 (1st movement) – Beethoven",
  "Clair de Lune – Debussy",
  "Gymnopédie No. 1 – Satie",
  "River Flows in You – Yiruma",
  "Canon in D – Pachelbel",
];

export function getSuggestions(query: string): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return SONG_LIBRARY.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
}
