/* ==========================================================================
   INITIALISATION ET DONNÉES SIMULÉES
   ========================================================================== */

const SUGGESTIONS_DB = {
    network: {
        title: "Dépannage Câble Réseau",
        tips: [
            "Vérifiez que le câble RJ45 est bien clipsé dans la prise murale et sur le PC.",
            "Si le câble est pincé ou abîmé, tentez de le redresser légèrement.",
            "Assurez-vous d'utiliser la prise murale attribuée à votre poste."
        ],
        prediag: "Liaison physique interrompue ou port RJ45 défectueux."
    },
    internet: {
        title: "Dépannage Connexion Internet",
        tips: [
            "Vérifiez si l'icône réseau indique 'Pas d'accès Internet'.",
            "Désactivez puis réactivez votre carte réseau ou le Wi-Fi.",
            "Vérifiez si vos collègues proches ont le même problème."
        ],
        prediag: "Perte de configuration IP / problème de serveur DNS ou Proxy."
    },
    peripheral: {
        title: "Dépannage Périphérique",
        tips: [
            "Débranchez et rebranchez le périphérique sur un autre port USB.",
            "Si c'est un écran, vérifiez l'alimentation et le câble vidéo (HDMI/VGA).",
            "Redémarrez votre ordinateur."
        ],
        prediag: "Dysfonctionnement du pilote USB ou défaillance matérielle."
    },
    printer: {
        title: "Dépannage Imprimante",
        tips: [
            "Vérifiez si un voyant d'erreur (rouge) est allumé sur l'imprimante.",
            "Éteignez l'imprimante, attendez 10 secondes puis rallumez-la.",
            "Vérifiez que l'imprimante n'est pas configurée 'Hors ligne'."
        ],
        prediag: "Spouleur d'impression bloqué ou bourrage papier."
    }
};

let currentUser = null;
let currentSelectedPanne = null;

document.addEventListener("DOMContentLoaded", () => {
    initDatabase();
    checkSession();
    setupEventListeners();
});

function initDatabase() {
    if (!localStorage.getItem("cc_users")) {
        const defaultUsers = [
            { id: 1, name: "Admin Tech", email: "tech@prici.ci", office: "Bureau IT", role: "tech", password: "admin" },
            { id: 2, name: "Kouassi Jean", email: "j.kouassi@prici.ci", office: "Bureau 102", role: "user", password: "user123" }
        ];
        localStorage.setItem("cc_users", JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem("cc_tickets")) {
        const defaultTickets = [
            {
                id: "TICK-101",
                userName: "Kouassi Jean",
                userEmail: "j.kouassi@prici.ci",
                office: "Bureau 102",
                pcName: "PC-DIR-01",
                category: "Imprimante en Panne",
                prediag: "Spouleur d'impression bloqué",
                description: "L'imprimante réseau du couloir ne répond plus.",
                urgency: "Moyenne",
                status: "En cours",
                date: "2026-08-09 10:30"
            }
        ];
        localStorage.setItem("cc_tickets", JSON.stringify(defaultTickets));
    }
}

/* ==========================================================================
   AUTHENTIFICATION & GESTION DES RÔLES
   ========================================================================== */

function setupEventListeners() {
    // Connexion avec vérification du rôle sélectionné
    document.getElementById("form-login").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const pass = document.getElementById("login-password").value;
        const selectedRole = document.querySelector('input[name="login-role"]:checked').value;

        const users = JSON.parse(localStorage.getItem("cc_users")) || [];
        const user = users.find(u => u.email === email && u.password === pass);

        if (!user) {
            alert("Identifiants incorrects. Veuillez vérifier votre e-mail et mot de passe.");
            return;
        }

        if (user.role !== selectedRole) {
            const roleCorrect = user.role === 'tech' ? 'Technicien' : 'Signalant';
            alert(`Ce compte est enregistré en tant que "${roleCorrect}". Veuillez cocher le bon profil.`);
            return;
        }

        currentUser = user;
        localStorage.setItem("cc_session", JSON.stringify(user));
        updateUI();
    });

    // Inscription avec contrôle du domaine @prici.ci
    document.getElementById("form-register").addEventListener("submit", (e) => {
        e.preventDefault();
        
        const name = document.getElementById("reg-name").value.trim();
        const email = document.getElementById("reg-email").value.trim().toLowerCase();
        const office = document.getElementById("reg-office").value.trim();
        const role = document.getElementById("reg-role").value;
        const pass = document.getElementById("reg-password").value;
        const emailError = document.getElementById("email-error");

        if (!email.endsWith("@prici.ci")) {
            emailError.classList.remove("hidden");
            return;
        } else {
            emailError.classList.add("hidden");
        }

        const users = JSON.parse(localStorage.getItem("cc_users")) || [];
        if (users.some(u => u.email === email)) {
            alert("Cet e-mail est déjà enregistré.");
            return;
        }

        const newUser = { id: Date.now(), name, email, office, role, password: pass };
        users.push(newUser);
        localStorage.setItem("cc_users", JSON.stringify(users));

        currentUser = newUser;
        localStorage.setItem("cc_session", JSON.stringify(newUser));
        alert("Compte créé avec succès !");
        updateUI();
    });

    // Déconnexion
    document.getElementById("btn-logout").addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem("cc_session");
        updateUI();
    });

    // Création de ticket
    document.getElementById("form-create-ticket").addEventListener("submit", handleTicketSubmission);

    // Réinitialisation mot de passe
    document.getElementById("form-forgot").addEventListener("submit", handleForgotSubmit);
}

window.switchAuthTab = function(tab) {
    const loginForm = document.getElementById("form-login");
    const regForm = document.getElementById("form-register");
    const loginBtn = document.getElementById("tab-login-btn");
    const regBtn = document.getElementById("tab-register-btn");

    if (tab === 'login') {
        loginForm.classList.remove("hidden");
        regForm.classList.add("hidden");
        loginBtn.classList.add("active");
        regBtn.classList.remove("active");
    } else {
        loginForm.classList.add("hidden");
        regForm.classList.remove("hidden");
        regBtn.classList.add("active");
        loginBtn.classList.remove("active");
    }
};

function checkSession() {
    const savedSession = localStorage.getItem("cc_session");
    if (savedSession) {
        currentUser = JSON.parse(savedSession);
    }
    updateUI();
}

function updateUI() {
    const authSec = document.getElementById("auth-section");
    const userSec = document.getElementById("user-section");
    const techSec = document.getElementById("tech-section");
    const userNav = document.getElementById("user-nav");
    const welcomeMsg = document.getElementById("welcome-message");
    const btnToggleTech = document.getElementById("btn-toggle-tech");

    if (!currentUser) {
        authSec.classList.remove("hidden");
        userSec.classList.add("hidden");
        techSec.classList.add("hidden");
        userNav.classList.add("hidden");
    } else {
        authSec.classList.add("hidden");
        userNav.classList.remove("hidden");
        welcomeMsg.textContent = `${currentUser.name} (${currentUser.office})`;

        if (currentUser.role === "tech") {
            btnToggleTech.classList.remove("hidden");
            btnToggleTech.onclick = toggleViews;
            showTechView();
        } else {
            btnToggleTech.classList.add("hidden");
            showUserView();
        }
    }
}

function showUserView() {
    document.getElementById("user-section").classList.remove("hidden");
    document.getElementById("tech-section").classList.add("hidden");
    renderUserTickets();
}

function showTechView() {
    document.getElementById("tech-section").classList.remove("hidden");
    document.getElementById("user-section").classList.add("hidden");
    renderTechDashboard();
}

function toggleViews() {
    const userSec = document.getElementById("user-section");
    if (userSec.classList.contains("hidden")) {
        showUserView();
    } else {
        showTechView();
    }
}

/* ==========================================================================
   MODALE MOT DE PASSE OUBLIÉ
   ========================================================================== */

window.openForgotModal = function(e) {
    e.preventDefault();
    document.getElementById("modal-forgot").classList.remove("hidden");
};

window.closeForgotModal = function() {
    document.getElementById("modal-forgot").classList.add("hidden");
    document.getElementById("form-forgot").reset();
};

function handleForgotSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim().toLowerCase();
    const newPassword = document.getElementById("forgot-new-password").value;

    if (!email.endsWith("@prici.ci")) {
        alert("L'adresse e-mail doit se terminer par @prici.ci");
        return;
    }

    const users = JSON.parse(localStorage.getItem("cc_users")) || [];
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        alert("Aucun compte trouvé avec cet e-mail.");
        return;
    }

    users[userIndex].password = newPassword;
    localStorage.setItem("cc_users", JSON.stringify(users));

    alert("Votre mot de passe a été mis à jour avec succès.");
    closeForgotModal();
}

/* ==========================================================================
   SIGNALEMENT & PRÉ-DIAGNOSTIC
   ========================================================================== */

window.selectPanne = function(type, label) {
    currentSelectedPanne = { type, label };
    
    document.querySelectorAll(".panne-card").forEach(c => c.classList.remove("selected"));
    event.currentTarget.classList.add("selected");

    const data = SUGGESTIONS_DB[type];
    if (!data) return;

    document.getElementById("ticket-form-card").classList.add("hidden");
    
    const suggBox = document.getElementById("suggestions-box");
    document.getElementById("suggestion-title").textContent = data.title;

    let tipsHTML = "<p>Tentez ces vérifications simples avant de signaler :</p><ul>";
    data.tips.forEach(tip => { tipsHTML += `<li>${tip}</li>`; });
    tipsHTML += "</ul>";

    document.getElementById("suggestion-content").innerHTML = tipsHTML;
    suggBox.classList.remove("hidden");
};

window.resolveWithSuggestion = function() {
    alert("Parfait ! Ravi d'avoir pu vous aider.");
    resetPanneSelection();
};

window.showTicketForm = function() {
    document.getElementById("suggestions-box").classList.add("hidden");
    const formCard = document.getElementById("ticket-form-card");
    const data = SUGGESTIONS_DB[currentSelectedPanne.type];
    
    document.getElementById("ticket-category").value = currentSelectedPanne.label;
    document.getElementById("ticket-prediag").value = data ? data.prediag : "Avis technique requis";
    formCard.classList.remove("hidden");
};

function resetPanneSelection() {
    document.getElementById("suggestions-box").classList.add("hidden");
    document.getElementById("ticket-form-card").classList.add("hidden");
    document.querySelectorAll(".panne-card").forEach(c => c.classList.remove("selected"));
    currentSelectedPanne = null;
}

function handleTicketSubmission(e) {
    e.preventDefault();

    const tickets = JSON.parse(localStorage.getItem("cc_tickets")) || [];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTicket = {
        id: "TICK-" + Math.floor(100 + Math.random() * 900),
        userName: currentUser.name,
        userEmail: currentUser.email,
        office: currentUser.office,
        pcName: document.getElementById("ticket-pc-name").value.trim(),
        category: document.getElementById("ticket-category").value,
        prediag: document.getElementById("ticket-prediag").value,
        description: document.getElementById("ticket-description").value.trim(),
        urgency: document.getElementById("ticket-urgency").value,
        status: "Nouveau",
        date: dateStr
    };

    tickets.unshift(newTicket);
    localStorage.setItem("cc_tickets", JSON.stringify(tickets));

    alert("Votre demande a été enregistrée.");
    document.getElementById("form-create-ticket").reset();
    resetPanneSelection();
    renderUserTickets();
}

function renderUserTickets() {
    const tickets = JSON.parse(localStorage.getItem("cc_tickets")) || [];
    const myTickets = tickets.filter(t => t.userEmail === currentUser.email);
    const tbody = document.getElementById("user-tickets-body");

    if (myTickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Aucun signalement enregistré.</td></tr>`;
        return;
    }

    tbody.innerHTML = myTickets.map(t => `
        <tr>
            <td><strong>${t.id}</strong></td>
            <td>${t.category}</td>
            <td><span class="badge badge-${t.urgency}">${t.urgency}</span></td>
            <td>${t.date}</td>
            <td><span class="badge badge-${t.status.replace(/\s+/g, '')}">${t.status}</span></td>
        </tr>
    `).join('');
}

/* ==========================================================================
   DASHBOARD TECHNICIEN & EXPORT CSV
   ========================================================================== */

function renderTechDashboard() {
    renderTechStats();
    renderTechTickets();
}

function renderTechStats() {
    const tickets = JSON.parse(localStorage.getItem("cc_tickets")) || [];
    document.getElementById("stat-total").textContent = tickets.length;
    document.getElementById("stat-new").textContent = tickets.filter(t => t.status === "Nouveau").length;
    document.getElementById("stat-progress").textContent = tickets.filter(t => t.status === "En cours").length;
    document.getElementById("stat-done").textContent = tickets.filter(t => t.status === "Résolu").length;
}

window.renderTechTickets = function() {
    const tickets = JSON.parse(localStorage.getItem("cc_tickets")) || [];
    const filterValue = document.getElementById("filter-status").value;
    const tbody = document.getElementById("tech-tickets-body");

    const filteredTickets = filterValue === "ALL" 
        ? tickets 
        : tickets.filter(t => t.status === filterValue);

    if (filteredTickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Aucun incident trouvé.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredTickets.map(t => `
        <tr>
            <td><strong>${t.id}</strong></td>
            <td>
                <strong>${t.userName}</strong><br>
                <small>${t.userEmail}</small>
            </td>
            <td>${t.office}<br><small>(${t.pcName})</small></td>
            <td>
                <strong>${t.category}</strong><br>
                <small style="color:var(--text-muted)">Diag : ${t.prediag}</small><br>
                <em>"${t.description}"</em>
            </td>
            <td><span class="badge badge-${t.urgency}">${t.urgency}</span></td>
            <td><span class="badge badge-${t.status.replace(/\s+/g, '')}">${t.status}</span></td>
            <td>
                ${t.status !== 'Résolu' ? `
                    <button class="btn btn-small btn-warning" onclick="changeStatus('${t.id}', 'En cours')">Prendre</button>
                    <button class="btn btn-small btn-success" onclick="changeStatus('${t.id}', 'Résolu')">Résoudre</button>
                ` : '<i class="fa-solid fa-check-double text-success"></i> Résolu'}
            </td>
        </tr>
    `).join('');
};

window.changeStatus = function(ticketId, newStatus) {
    const tickets = JSON.parse(localStorage.getItem("cc_tickets")) || [];
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = newStatus;
        localStorage.setItem("cc_tickets", JSON.stringify(tickets));
        renderTechDashboard();
    }
};

window.exportTicketsCSV = function() {
    const tickets = JSON.parse(localStorage.getItem("cc_tickets")) || [];
    if (tickets.length === 0) {
        alert("Aucun ticket à exporter.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Demandeur,Email,Bureau,PC,Categorie,PreDiagnostic,Urgence,Statut,Date\n";

    tickets.forEach(t => {
        const row = [
            t.id,
            `"${t.userName}"`,
            t.userEmail,
            `"${t.office}"`,
            t.pcName,
            `"${t.category}"`,
            `"${t.prediag}"`,
            t.urgency,
            t.status,
            t.date
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `incidents_cc_prici_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};