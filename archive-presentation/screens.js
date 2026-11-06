// Maquettes d'écrans dessinées à partir des fonctions connues de Kavod.
// Les noms et les chiffres sont fictifs : ce ne sont pas des captures de l'appli.

const BG = "#1b1820";
const CARD = "#2b2730";
const LINE = "#322c33";
const GOLD = "#e2ab1f";
const INK = "#f6efdc";
const MUTED = "#a9a194";
const FONT = '"Geist Variable", system-ui, sans-serif';

function surface(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  c.fillStyle = BG;
  c.fillRect(0, 0, w, h);
  c.textBaseline = "alphabetic";
  return { canvas, c };
}

function text(c, value, x, y, size, color = INK, weight = 500, align = "left") {
  c.font = `${weight} ${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.fillText(value, x, y);
}

function box(c, x, y, w, h, r, fill, stroke) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 3;
    c.stroke();
  }
}

function phoneHeader(c, title) {
  text(c, "09:00", 62, 70, 30, INK, 600);
  box(c, 462, 48, 44, 22, 7, null, INK);
  box(c, 467, 53, 26, 12, 3, INK);
  text(c, "Kavod", 56, 150, 34, GOLD, 600);
  text(c, title, 56, 236, 62, INK, 600);
}

function qrBlock(c, x, y, size) {
  const n = 25;
  const cell = size / n;
  box(c, x - 34, y - 34, size + 68, size + 68, 34, INK);
  c.fillStyle = BG;
  const corner = (cx, cy) => {
    c.fillRect(x + cx * cell, y + cy * cell, cell * 7, cell * 7);
    c.fillStyle = INK;
    c.fillRect(x + (cx + 1) * cell, y + (cy + 1) * cell, cell * 5, cell * 5);
    c.fillStyle = BG;
    c.fillRect(x + (cx + 2) * cell, y + (cy + 2) * cell, cell * 3, cell * 3);
  };
  // Motif fixe et volontairement non scannable.
  let seed = 7;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      seed = (seed * 31 + 11) % 97;
      const inCorner = (i < 8 && j < 8) || (i > 16 && j < 8) || (i < 8 && j > 16);
      if (!inCorner && seed % 2) c.fillRect(x + i * cell, y + j * cell, cell, cell);
    }
  }
  corner(0, 0);
  corner(18, 0);
  corner(0, 18);
}

const W = 560;
const H = 1200;

function phoneHome() {
  const { canvas, c } = surface(W, H);
  phoneHeader(c, "Bonjour Grâce");
  box(c, 48, 290, W - 96, 230, 36, GOLD);
  text(c, "Prochain culte", 84, 368, 32, "#0a0a0a", 500);
  text(c, "Dimanche, 9 h", 84, 442, 56, "#0a0a0a", 600);
  [
    ["Mon QR", "Présence au culte"],
    ["Mes enfants", "Code de retrait"],
    ["Votes", "Sondages ouverts"],
    ["Entreprises", "Annuaire des fidèles"],
  ].forEach(([title, sub], i) => {
    const y = 560 + i * 148;
    box(c, 48, y, W - 96, 128, 30, CARD);
    box(c, 78, y + 34, 60, 60, 18, GOLD);
    text(c, title, 164, y + 58, 36, INK, 600);
    text(c, sub, 164, y + 100, 27, MUTED);
  });
  return canvas;
}

function phoneQr() {
  const { canvas, c } = surface(W, H);
  phoneHeader(c, "Mon QR");
  qrBlock(c, 95, 340, 370);
  text(c, "Grâce N'Guessan", W / 2, 860, 44, INK, 600, "center");
  text(c, "À présenter à l'équipe de pointage", W / 2, 918, 28, MUTED, 400, "center");
  box(c, 96, 980, W - 192, 100, 50, GOLD);
  text(c, "Culte de dimanche", W / 2, 1044, 34, "#0a0a0a", 600, "center");
  return canvas;
}

function phoneKids() {
  const { canvas, c } = surface(W, H);
  phoneHeader(c, "Mes enfants");
  box(c, 48, 290, W - 96, 190, 34, CARD);
  box(c, 82, 330, 110, 110, 55, GOLD);
  text(c, "E", 137, 405, 58, "#0a0a0a", 600, "center");
  text(c, "Emmanuel", 220, 372, 42, INK, 600);
  text(c, "Classe des petits", 220, 420, 26, MUTED);
  box(c, 48, 520, W - 96, 380, 34, GOLD);
  text(c, "Code de retrait", W / 2, 604, 34, "#0a0a0a", 500, "center");
  text(c, "4 7 2 9", W / 2, 750, 110, "#0a0a0a", 600, "center");
  text(c, "Valable pour ce culte", W / 2, 838, 30, "#0a0a0a", 500, "center");
  text(c, "À présenter au moniteur", W / 2, 980, 32, INK, 500, "center");
  text(c, "pour reprendre votre enfant", W / 2, 1026, 28, MUTED, 400, "center");
  return canvas;
}

function phoneVote() {
  const { canvas, c } = surface(W, H);
  phoneHeader(c, "Votes");
  text(c, "Sondage de l'église", 56, 330, 30, MUTED);
  text(c, "Quel horaire pour", 56, 410, 46, INK, 600);
  text(c, "le culte du soir ?", 56, 468, 46, INK, 600);
  ["17 h", "18 h", "19 h"].forEach((label, i) => {
    const y = 540 + i * 136;
    const on = i === 1;
    box(c, 48, y, W - 96, 116, 30, on ? GOLD : CARD, on ? null : LINE);
    text(c, label, 96, y + 72, 42, on ? "#0a0a0a" : INK, 600);
  });
  text(c, "Vote secret", W / 2, 1000, 30, MUTED, 400, "center");
  box(c, 96, 1040, W - 192, 92, 46, INK);
  text(c, "Je vote", W / 2, 1100, 34, "#0a0a0a", 600, "center");
  return canvas;
}

function phoneShops() {
  const { canvas, c } = surface(W, H);
  phoneHeader(c, "Entreprises");
  box(c, 48, 280, W - 96, 76, 38, CARD);
  text(c, "Rechercher un secteur", 92, 330, 28, MUTED);
  [
    ["Atelier Béthel", "Couture"],
    ["Horizon Bâtiment", "Construction"],
    ["Saveurs d'Ébène", "Restauration"],
  ].forEach(([name, sector], i) => {
    const y = 390 + i * 256;
    box(c, 48, y, W - 96, 232, 32, CARD);
    box(c, 78, y + 32, 84, 84, 24, GOLD);
    text(c, name, 186, y + 72, 34, INK, 600);
    text(c, sector, 186, y + 114, 27, MUTED);
    box(c, 78, y + 146, 180, 58, 29, null, GOLD);
    text(c, "Appeler", 168, y + 186, 26, GOLD, 600, "center");
    box(c, 276, y + 146, 200, 58, 29, null, GOLD);
    text(c, "WhatsApp", 376, y + 186, 26, GOLD, 600, "center");
  });
  return canvas;
}

function phoneTransfer() {
  const { canvas, c } = surface(W, H);
  phoneHeader(c, "Mon transfert");
  box(c, 48, 290, W - 96, 150, 32, CARD);
  text(c, "Église de départ", 84, 352, 28, MUTED);
  text(c, "Mon église actuelle", 84, 404, 38, INK, 600);
  box(c, W / 2 - 4, 446, 8, 56, 4, GOLD);
  box(c, 48, 508, W - 96, 150, 32, CARD);
  text(c, "Église d'accueil", 84, 570, 28, MUTED);
  text(c, "Ma nouvelle église", 84, 622, 38, INK, 600);
  box(c, 48, 700, W - 96, 240, 34, GOLD);
  text(c, "Code de transfert", W / 2, 776, 32, "#0a0a0a", 500, "center");
  text(c, "KV 48 21", W / 2, 876, 72, "#0a0a0a", 600, "center");
  text(c, "Lettre de recommandation prête", W / 2, 1020, 29, INK, 500, "center");
  return canvas;
}

const LW = 1600;
const LH = 1000;
const MENU = ["Membres", "Présences", "Finances", "Planning", "Documents", "Annonces", "Suivi pastoral"];

function shell(c, active) {
  c.fillStyle = "#0b0a0d";
  c.fillRect(0, 0, 340, LH);
  text(c, "Kavod", 52, 96, 50, GOLD, 600);
  MENU.forEach((label, i) => {
    const y = 170 + i * 92;
    if (i === active) box(c, 28, y - 8, 284, 70, 18, CARD);
    text(c, label, 56, y + 38, 32, i === active ? GOLD : MUTED, 500);
  });
}

function desktopCare() {
  const { canvas, c } = surface(LW, LH);
  shell(c, 6);
  text(c, "Suivi pastoral", 400, 110, 58, INK, 600);
  [
    ["À visiter cette semaine", "3"],
    ["En accompagnement", "12"],
    ["Rendez-vous à venir", "5"],
  ].forEach(([label, value], i) => {
    const x = 400 + i * 390;
    box(c, x, 160, 366, 210, 28, CARD);
    text(c, label, x + 34, 226, 29, MUTED);
    text(c, value, x + 34, 322, 80, GOLD, 600);
  });
  box(c, 400, 400, 1146, 530, 28, CARD);
  text(c, "À ne pas oublier", 440, 470, 36, INK, 600);
  [
    ["Visite à domicile", "Demain"],
    ["Appel de nouvelles", "Aujourd'hui"],
    ["Accompagnement d'un nouveau fidèle", "Cette semaine"],
    ["Rencontre pastorale", "Samedi"],
  ].forEach(([what, when], i) => {
    const y = 506 + i * 102;
    box(c, 440, y, 1066, 88, 18, "#141216");
    box(c, 470, y + 28, 32, 32, 16, null, GOLD);
    text(c, what, 530, y + 56, 33, INK, 500);
    text(c, when, 1476, y + 56, 30, GOLD, 600, "right");
  });
  text(c, "Contenu confidentiel, réservé à l'équipe pastorale", 400, 974, 24, MUTED);
  return canvas;
}

export function drawScreens() {
  return {
    home: phoneHome(),
    qr: phoneQr(),
    kids: phoneKids(),
    vote: phoneVote(),
    shops: phoneShops(),
    transfer: phoneTransfer(),
    care: desktopCare(),
  };
}
