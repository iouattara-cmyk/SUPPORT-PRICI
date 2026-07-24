/* =====================================================================
   SIGNALEMENT DE PANNE - script.js
   Application 100% front-end (HTML/CSS/JS), persistance via localStorage.
   ===================================================================== */
 
/* ---------------------------------------------------------------------
   CLES DE STOCKAGE LOCALSTORAGE
   --------------------------------------------------------------------- */
const LS_KEYS = {
  USER: "panne_current_user",
  TICKETS: "panne_tickets",          // tableau de tickets
  COUNTER_DONE: "panne_counter_done", // compteur global d'interventions terminées
  COUNTER_RESOLVED_NO_TICKET: "panne_counter_resolved_no_ticket" // résolus sans ticket
};
 
/* ---------------------------------------------------------------------
   SUGGESTIONS AUTOMATIQUES PAR TYPE DE PANNE
   Ces étapes s'affichent dès que l'utilisateur choisit un des types
   concernés. Elles servent de premier niveau de diagnostic : si elles
   suffisent, aucun ticket n'est créé. Sinon, elles sont transmises au
   technicien avec le ticket pour qu'il sache déjà ce qui a été tenté.
   --------------------------------------------------------------------- */
const AUTO_SUGGESTIONS = {
  reseau: [
    "Vérifier que le câble Ethernet est bien branché des deux côtés",
    "Redémarrer le routeur / la box internet",
    "Vérifier que le Wi-Fi est activé sur l'appareil",
    "Essayer de se reconnecter au réseau (oublier puis reconnecter)",
    "Vérifier l'adresse IP obtenue (ipconfig / ifconfig)"
  ],
  imprimante: [
    "Vérifier que l'imprimante est allumée et branchée",
    "Vérifier le niveau d'encre / de toner",
    "Vérifier qu'il n'y a pas de bourrage papier",
    "Redémarrer l'imprimante et l'ordinateur",
    "Réinstaller ou mettre à jour le pilote d'imprimante"
  ],
  peripherique: [
    "Vérifier les branchements (USB, alimentation, Bluetooth)",
    "Tester le périphérique sur un autre poste",
    "Redémarrer l'ordinateur",
    "Mettre à jour ou réinstaller les pilotes"
  ],
  autre: [
    "Redémarrer l'appareil concerné",
    "Vérifier tous les branchements",
    "Consulter la documentation du matériel",
    "Noter les messages d'erreur affichés, le cas échéant"
  ]
};
 
// Types pour lesquels on affiche des suggestions automatiques
const AUTO_SUGGESTION_TYPES = Object.keys(AUTO_SUGGESTIONS);
 
// Libellés lisibles pour chaque type de panne
const TYPE_LABELS = {
  reseau: "Problème de connexion réseau",
  imprimante: "Imprimante",
  peripherique: "Périphérique",
  electrique: "Électrique",
  informatique: "Informatique",
  mobilier: "Mobilier",
  autre: "Autre"
};
 
/* ---------------------------------------------------------------------
   ETAT EN MEMOIRE (pour le signalement en cours, avant création du ticket)
   --------------------------------------------------------------------- */
let pendingReport = null; // contient les données du formulaire en cours de validation
 
/* =====================================================================
   UTILITAIRES LOCALSTORAGE
   ===================================================================== */
function getTickets() {
  const raw = localStorage.getItem(LS_KEYS.TICKETS);
  return raw ? JSON.parse(raw) : [];
}
 
function saveTickets(tickets) {
  localStorage.setItem(LS_KEYS.TICKETS, JSON.stringify(tickets));
}
 
function getCounterDone() {
  return parseInt(localStorage.getItem(LS_KEYS.COUNTER_DONE) || "0", 10);
}
 
function incrementCounterDone() {
  const current = getCounterDone();
  localStorage.setItem(LS_KEYS.COUNTER_DONE, String(current + 1));
}
 
function getCounterResolvedNoTicket() {
  return parseInt(localStorage.getItem(LS_KEYS.COUNTER_RESOLVED_NO_TICKET) || "0", 10);
}
 
function incrementCounterResolvedNoTicket() {
  const current = getCounterResolvedNoTicket();
  localStorage.setItem(LS_KEYS.COUNTER_RESOLVED_NO_TICKET, String(current + 1));
}
 
function getCurrentUser() {
  return localStorage.getItem(LS_KEYS.USER);
}
 
function setCurrentUser(name) {
  localStorage.setItem(LS_KEYS.USER, name);
}
 
function clearCurrentUser() {
  localStorage.removeItem(LS_KEYS.USER);
}
 
/* =====================================================================
   GESTION DE LA CONNEXION (simulation simple, pas de vrai backend)
   ===================================================================== */
const loginForm = document.getElementById("login-form");
const loginNameInput = document.getElementById("login-name");
const viewLogin = document.getElementById("view-login");
const appHeader = document.getElementById("app-header");
const currentUserLabel = document.getElementById("current-user-label");
const logoutBtn = document.getElementById("logout-btn");
 
loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = loginNameInput.value.trim();
  if (!name) return;
  setCurrentUser(name);
  enterApp();
});
 
logoutBtn.addEventListener("click", function () {
  clearCurrentUser();
  location.reload();
});
 
function enterApp() {
  const user = getCurrentUser();
  viewLogin.classList.add("hidden");
  appHeader.classList.remove("hidden");
  currentUserLabel.textContent = "Connecté : " + user;
  // Pré-remplir le champ "Nom" du formulaire avec le nom de connexion
  document.getElementById("f-nom").value = user;
  showView("view-signalement");
  refreshTechnicienView();
  refreshDashboard();
}
 
/* =====================================================================
   NAVIGATION ENTRE LES VUES
   ===================================================================== */
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view:not(#view-login)");
 
navButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    showView(btn.dataset.view);
  });
});
 
function showView(viewId) {
  views.forEach(function (v) {
    v.classList.toggle("hidden", v.id !== viewId);
  });
  navButtons.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  if (viewId === "view-technicien") refreshTechnicienView();
  if (viewId === "view-dashboard") refreshDashboard();
}
 
/* =====================================================================
   FORMULAIRE DE SIGNALEMENT - étape A
   ===================================================================== */
const panneForm = document.getElementById("panne-form");
const typeSelect = document.getElementById("f-type");
const autoDiagBox = document.getElementById("auto-diagnostic-box");
const autoDiagList = document.getElementById("auto-diagnostic-list");
 
const stepFormulaire = document.getElementById("step-formulaire");
const stepValidation = document.getElementById("step-validation");
const stepResolu = document.getElementById("step-resolu");
const stepTicketCree = document.getElementById("step-ticket-cree");
 
// Affiche/masque les suggestions automatiques selon le type sélectionné
typeSelect.addEventListener("change", function () {
  const type = typeSelect.value;
  if (AUTO_SUGGESTION_TYPES.includes(type)) {
    renderAutoSuggestions(type);
    autoDiagBox.classList.remove("hidden");
  } else {
    autoDiagBox.classList.add("hidden");
    autoDiagList.innerHTML = "";
  }
});
 
function renderAutoSuggestions(type) {
  autoDiagList.innerHTML = "";
  AUTO_SUGGESTIONS[type].forEach(function (step, index) {
    const li = document.createElement("li");
    const checkboxId = "auto-step-" + index;
    li.innerHTML =
      '<input type="checkbox" id="' + checkboxId + '" data-step="' + escapeHtml(step) + '">' +
      '<label for="' + checkboxId + '" style="font-weight:400;margin:0;">' + escapeHtml(step) + "</label>";
    autoDiagList.appendChild(li);
  });
}
 
function getTriedSteps() {
  const checkboxes = autoDiagList.querySelectorAll("input[type=checkbox]");
  const result = [];
  checkboxes.forEach(function (cb) {
    result.push({ step: cb.dataset.step, tried: cb.checked });
  });
  return result;
}
 
panneForm.addEventListener("submit", function (e) {
  e.preventDefault();
 
  const nom = document.getElementById("f-nom").value.trim();
  const bureau = document.getElementById("f-bureau").value.trim();
  const type = document.getElementById("f-type").value;
  const description = document.getElementById("f-description").value.trim();
  const suggestion = document.getElementById("f-suggestion").value.trim();
  const autoSteps = AUTO_SUGGESTION_TYPES.includes(type) ? getTriedSteps() : [];
 
  if (!nom || !bureau || !type || !description) return;
 
  pendingReport = {
    nom: nom,
    bureau: bureau,
    type: type,
    typeLabel: TYPE_LABELS[type] || type,
    description: description,
    suggestion: suggestion,
    autoSteps: autoSteps
  };
 
  showRecap(pendingReport);
  stepFormulaire.classList.add("hidden");
  stepValidation.classList.remove("hidden");
});
 
function showRecap(report) {
  const recapBox = document.getElementById("recap-box");
  let html = "";
  html += "<p><strong>Nom :</strong> " + escapeHtml(report.nom) + "</p>";
  html += "<p><strong>Bureau :</strong> " + escapeHtml(report.bureau) + "</p>";
  html += "<p><strong>Type de panne :</strong> " + escapeHtml(report.typeLabel) + "</p>";
  html += "<p><strong>Description :</strong> " + escapeHtml(report.description) + "</p>";
  if (report.suggestion) {
    html += "<p><strong>Votre suggestion :</strong> " + escapeHtml(report.suggestion) + "</p>";
  }
  if (report.autoSteps && report.autoSteps.length > 0) {
    const triedCount = report.autoSteps.filter(function (s) { return s.tried; }).length;
    html += "<p><strong>Étapes automatiques essayées :</strong> " + triedCount + " / " + report.autoSteps.length + "</p>";
  }
  recapBox.innerHTML = html;
}
 
/* =====================================================================
   ETAPE B : "La suggestion a-t-elle résolu le problème ?"
   ===================================================================== */
document.getElementById("btn-utile-oui").addEventListener("click", function () {
  incrementCounterResolvedNoTicket();
  stepValidation.classList.add("hidden");
  stepResolu.classList.remove("hidden");
  refreshDashboard();
});
 
document.getElementById("btn-utile-non").addEventListener("click", function () {
  const ticket = createTicket(pendingReport);
  stepValidation.classList.add("hidden");
  document.getElementById("ticket-id-display").textContent = "#" + ticket.id;
  stepTicketCree.classList.remove("hidden");
  refreshTechnicienView();
  refreshDashboard();
});
 
function createTicket(report) {
  const tickets = getTickets();
  const ticket = {
    id: Date.now(),
    nom: report.nom,
    bureau: report.bureau,
    type: report.type,
    typeLabel: report.typeLabel,
    description: report.description,
    suggestion: report.suggestion,
    autoSteps: report.autoSteps,
    status: "en_attente", // en_attente -> en_cours -> termine
    createdAt: new Date().toISOString(),
    arrivedAt: null,
    closedAt: null
  };
  tickets.unshift(ticket);
  saveTickets(tickets);
  return ticket;
}
 
/* =====================================================================
   BOUTONS "NOUVEAU SIGNALEMENT" (reset du formulaire)
   ===================================================================== */
document.getElementById("btn-nouveau-1").addEventListener("click", resetFormulaireFlow);
document.getElementById("btn-nouveau-2").addEventListener("click", resetFormulaireFlow);
 
function resetFormulaireFlow() {
  pendingReport = null;
  panneForm.reset();
  document.getElementById("f-nom").value = getCurrentUser() || "";
  autoDiagBox.classList.add("hidden");
  autoDiagList.innerHTML = "";
 
  stepResolu.classList.add("hidden");
  stepTicketCree.classList.add("hidden");
  stepValidation.classList.add("hidden");
  stepFormulaire.classList.remove("hidden");
}
 
/* =====================================================================
   ESPACE TECHNICIEN
   ===================================================================== */
const ticketsListEl = document.getElementById("tickets-list");
const noTicketsMsg = document.getElementById("no-tickets-msg");
const filterButtons = document.querySelectorAll(".filter-btn");
let currentFilter = "all";
 
filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(function (b) { b.classList.toggle("active", b === btn); });
    refreshTechnicienView();
  });
});
 
const STATUS_LABELS = {
  en_attente: "En attente",
  en_cours: "En cours",
  termine: "Terminé"
};
 
function refreshTechnicienView() {
  const tickets = getTickets();
  const filtered = currentFilter === "all"
    ? tickets
    : tickets.filter(function (t) { return t.status === currentFilter; });
 
  ticketsListEl.innerHTML = "";
 
  if (filtered.length === 0) {
    noTicketsMsg.classList.remove("hidden");
    return;
  }
  noTicketsMsg.classList.add("hidden");
 
  filtered.forEach(function (ticket) {
    ticketsListEl.appendChild(buildTicketCard(ticket));
  });
}
 
function buildTicketCard(ticket) {
  const card = document.createElement("div");
  card.className = "ticket-card";
 
  let diagnosticHtml = "";
  if (ticket.suggestion || (ticket.autoSteps && ticket.autoSteps.length > 0)) {
    diagnosticHtml += '<div class="ticket-diagnostic"><strong>Diagnostic déjà effectué :</strong>';
    if (ticket.suggestion) {
      diagnosticHtml += "<p>Suggestion de l'utilisateur : " + escapeHtml(ticket.suggestion) + "</p>";
    }
    if (ticket.autoSteps && ticket.autoSteps.length > 0) {
      diagnosticHtml += "<ul>";
      ticket.autoSteps.forEach(function (s) {
        const cls = s.tried ? "tried-yes" : "tried-no";
        const mark = s.tried ? "✔ Essayé" : "✘ Non essayé";
        diagnosticHtml += "<li>" + escapeHtml(s.step) + ' — <span class="' + cls + '">' + mark + "</span></li>";
      });
      diagnosticHtml += "</ul>";
    }
    diagnosticHtml += "</div>";
  }
 
  let actionsHtml = '<div class="ticket-actions">';
  if (ticket.status === "en_attente") {
    actionsHtml += '<button class="btn btn-primary btn-sm" data-action="arrivee" data-id="' + ticket.id + '">Signaler l\'arrivée pour dépannage</button>';
  } else if (ticket.status === "en_cours") {
    actionsHtml += '<button class="btn btn-success btn-sm" data-action="terminer" data-id="' + ticket.id + '">Marquer le service comme terminé</button>';
  }
  actionsHtml += "</div>";
 
  let metaHtml = '<div class="ticket-meta">Créé le ' + formatDate(ticket.createdAt);
  if (ticket.arrivedAt) metaHtml += " · Arrivée le " + formatDate(ticket.arrivedAt);
  if (ticket.closedAt) metaHtml += " · Terminé le " + formatDate(ticket.closedAt);
  metaHtml += "</div>";
 
  card.innerHTML =
    '<div class="ticket-header">' +
      "<h3>" + escapeHtml(ticket.typeLabel) + " — " + escapeHtml(ticket.bureau) + "</h3>" +
      '<span class="status-badge status-' + ticket.status + '">' + STATUS_LABELS[ticket.status] + "</span>" +
    "</div>" +
    '<div class="ticket-body">' +
      "<p><strong>Signalé par :</strong> " + escapeHtml(ticket.nom) + "</p>" +
      "<p><strong>Description :</strong> " + escapeHtml(ticket.description) + "</p>" +
    "</div>" +
    diagnosticHtml +
    actionsHtml +
    metaHtml;
 
  return card;
}
 
// Délégation d'événements pour les boutons d'action des tickets
ticketsListEl.addEventListener("click", function (e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
 
  const tickets = getTickets();
  const ticket = tickets.find(function (t) { return t.id === id; });
  if (!ticket) return;
 
  if (action === "arrivee") {
    ticket.status = "en_cours";
    ticket.arrivedAt = new Date().toISOString();
  } else if (action === "terminer") {
    ticket.status = "termine";
    ticket.closedAt = new Date().toISOString();
    incrementCounterDone(); // compteur global d'interventions terminées
  }
 
  saveTickets(tickets);
  refreshTechnicienView();
  refreshDashboard();
});
 
/* =====================================================================
   TABLEAU DE BORD
   ===================================================================== */
function refreshDashboard() {
  const tickets = getTickets();
  const enAttente = tickets.filter(function (t) { return t.status === "en_attente"; }).length;
  const enCours = tickets.filter(function (t) { return t.status === "en_cours"; }).length;
 
  document.getElementById("stat-terminees").textContent = getCounterDone();
  document.getElementById("stat-attente").textContent = enAttente;
  document.getElementById("stat-cours").textContent = enCours;
  document.getElementById("stat-resolus-sans-ticket").textContent = getCounterResolvedNoTicket();
}
 
/* =====================================================================
   UTILITAIRES
   ===================================================================== */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
 
function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
 
/* =====================================================================
   INITIALISATION AU CHARGEMENT DE LA PAGE
   ===================================================================== */
window.addEventListener("DOMContentLoaded", function () {
  const user = getCurrentUser();
  if (user) {
    enterApp();
  }
});
