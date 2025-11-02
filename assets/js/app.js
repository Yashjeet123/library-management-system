class LibraryApp {
  constructor() {
    this.apiUrl = "api.php";
    this.storageKey = "lms_data_v1";
    this.themeKey = "lms_theme";
    this.lib = { items: [], users: [], transactions: [] };
    this.currentUserId = Number(localStorage.getItem("lms_selected_user") || 0);

    this.initElements();
    this.bindEvents();
    this.init();
  }

  initElements() {
    this.el = {
      userSelect: document.getElementById("user-select"),
      switchUser: document.getElementById("switch-user"),
      searchInput: document.getElementById("search-input"),
      categoryFilter: document.getElementById("category-filter"),
      availabilityFilter: document.getElementById("availability-filter"),
      itemsGrid: document.getElementById("items-grid"),
      statTotal: document.getElementById("stat-total"),
      statAvailable: document.getElementById("stat-available"),
      statBorrowed: document.getElementById("stat-borrowed"),
      statUsers: document.getElementById("stat-users"),
      userDetails: document.getElementById("user-details"),
      borrowedList: document.getElementById("borrowed-list"),
      transactions: document.getElementById("transactions"),
      modalOverlay: document.getElementById("modal-overlay"),
      modalClose: document.getElementById("modal-close"),
      modalCancel: document.getElementById("modal-cancel"),
      modalItemTitle: document.getElementById("modal-item-title"),
      modalItemId: document.getElementById("modal-item-id"),
      dueDate: document.getElementById("due-date"),
      borrowForm: document.getElementById("borrow-form"),
      themeToggle: document.getElementById("theme-toggle"),
      toasts: document.getElementById("toasts"),
    };
  }

  bindEvents() {
    this.el.switchUser.addEventListener("click", () => this.handleSwitchUser());
    this.el.searchInput.addEventListener("input", () =>
      this.renderItemsGridDebounced()
    );
    this.el.categoryFilter.addEventListener("change", () =>
      this.renderItemsGrid()
    );
    this.el.availabilityFilter.addEventListener("change", () =>
      this.renderItemsGrid()
    );
    this.el.modalClose.addEventListener("click", () => this.closeModal());
    this.el.modalCancel.addEventListener("click", () => this.closeModal());
    this.el.borrowForm &&
      this.el.borrowForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.confirmBorrow();
      });
    this.el.themeToggle.addEventListener("change", (e) =>
      this.setTheme(e.target.checked ? "dark" : "light")
    );
    this.renderItemsGridDebounced = this.debounce(
      this.renderItemsGrid.bind(this),
      300
    );
  }

  async init() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.lib = JSON.parse(stored);
      this.renderAll();
      this.restoreTheme();
    } else {
      try {
        const res = await fetch(`${this.apiUrl}?action=getSampleData`);
        const json = await res.json();
        if (json.success) {
          this.lib.items = json.data.items;
          this.lib.users = json.data.users;
          this.lib.transactions = json.data.transactions || [];
          this.save();
          this.renderAll();
        } else {
          console.error("Failed to fetch sample data", json.message);
        }
      } catch (err) {
        console.error("Error fetching sample data", err);
      }
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.lib));
  }

  renderAll() {
    this.renderUserSelect();
    this.renderItemsGrid();
    this.renderStats();
    this.renderUserPanel();
    this.renderBorrowedList();
    this.renderTransactions();
  }

  renderUserSelect() {
    const sel = this.el.userSelect;
    sel.innerHTML =
      `<option value="">-- Select user --</option>` +
      this.lib.users
        .map(
          (u) =>
            `<option value="${u.id}" ${
              u.id === this.currentUserId ? "selected" : ""
            }>${u.name} (${u.membershipType})</option>`
        )
        .join("");
  }

  renderItemsGrid() {
    let items = this.lib.items.slice();
    const q = (this.el.searchInput.value || "").trim().toLowerCase();
    const cat = this.el.categoryFilter.value;
    const av = this.el.availabilityFilter.value;

    if (q) {
      items = items.filter((i) => {
        const fields = [
          i.title,
          i.type,
          i.meta?.author,
          i.meta?.publisher,
          i.meta?.director,
          i.meta?.isbn,
          i.meta?.genre,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(q);
      });
    }

    if (cat && cat !== "all") items = items.filter((i) => i.type === cat);
    if (av === "available") items = items.filter((i) => i.isAvailable);
    if (av === "borrowed") items = items.filter((i) => !i.isAvailable);

    const html = items
      .map((i) => {
        const meta = i.meta || {};
        const subtitle = [meta.author, meta.publisher, meta.director]
          .filter(Boolean)
          .join(" • ");
        const badge = i.isAvailable
          ? `<span class="badge available">Available</span>`
          : `<span class="badge borrowed">Borrowed</span>`;
        const overdue = this.isOverdue(i) ? " ⚠️ Overdue" : "";
        return `
        <div class="item-card" data-id="${i.id}">
          <h4>${i.title}</h4>
          <div class="item-meta">${subtitle} • ${i.type} • ${
          i.publicationYear
        }</div>
          
          <div class="item-actions">
            ${
              i.isAvailable
                ? `<button class="btn small ghost" data-action="borrow" data-id="${i.id}">Borrow</button>`
                : `<button class="btn small ghost ghost" data-action="return" data-id="${i.id}">Return</button>`
            }
            ${badge}${overdue}
          </div>
        </div>`;
      })
      .join("");

    this.el.itemsGrid.innerHTML = html;

    this.el.itemsGrid.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = btn.getAttribute("data-action");
        const id = Number(btn.getAttribute("data-id"));
        const item = this.findItemById(id);
        if (action === "borrow") this.openBorrowModal(item);
        if (action === "return") this.returnItem(id);
        if (action === "details") this.notify(itemDetailsString(item), "info");
      });
    });

    function itemDetailsString(it) {
      const meta = it.meta || {};
      const parts = [
        `Title: ${it.title}`,
        `Type: ${it.type}`,
        `Year: ${it.publicationYear}`,
      ];
      if (meta.author) parts.push(`Author: ${meta.author}`);
      if (meta.isbn) parts.push(`ISBN: ${meta.isbn}`);
      if (meta.director) parts.push(`Director: ${meta.director}`);
      return parts.join(" | ");
    }
  }

  renderStats() {
    const total = this.lib.items.length;
    const available = this.lib.items.filter((i) => i.isAvailable).length;
    const borrowed = total - available;
    const users = this.lib.users.length;

    this.el.statTotal.textContent = total;
    this.el.statAvailable.textContent = available;
    this.el.statBorrowed.textContent = borrowed;
    this.el.statUsers.textContent = users;
  }

  renderUserPanel() {
    if (!this.currentUserId) {
      this.el.userDetails.innerHTML = "<p>No user selected</p>";
      return;
    }
    const u = this.findUserById(this.currentUserId);
    if (!u) return (this.el.userDetails.innerHTML = "<p>User not found</p>");
    const borrowedCount = (u.borrowedItems || []).length;
    const maxLimit = u.membershipType === "Premium" ? 10 : 3;
    this.el.userDetails.innerHTML = `
      <div class="user-info-header">
        <div class="user-info-row">
          <p><strong>Name:</strong> <span id="userName">${u.name}</span></p>
          <p><strong>Email:</strong> <span id="userEmail">${u.email}</span></p>
          <p><strong>Membership:</strong> <span id="userMembership">${u.membershipType}</span></p>
          <p><strong>Borrowed Items:</strong> 
            <span id="userBorrowedCount">${borrowedCount}</span>/<span id="userMaxBorrow">${maxLimit}</span>
          </p>
        </div>
      </div>
    `;
  }

  renderBorrowedList() {
    const list = this.el.borrowedList;
    list.innerHTML = "";
    if (!this.currentUserId) return (list.innerHTML = "<li>Select a user</li>");
    const items = this.getUserBorrowedItems(this.currentUserId);
    if (!items.length) return (list.innerHTML = "<li>No borrowed items</li>");
    items.forEach((it) => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="items-grid">
                        <strong>${it.title}</strong>
                        <span>${it.type} - ${it.publicationYear}</span>
                        <div style="font-size:12px;color:#6b7280; margin:5px">
                              Due: ${
                                it.dueDate ? it.dueDate.split("T")[0] : "N/A"
                              }
                        </div>
                      </div>
                      <div>
                        <button class="btn small ghost" data-return="${it.id}">
                          Return
                        </button>
                      </div>`;
      list.appendChild(li);
    });
    list.querySelectorAll("[data-return]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-return"));
        this.returnItem(id);
      });
    });
  }

  renderTransactions() {
    const wrap = this.el.transactions;
    wrap.innerHTML = "";
    if (!this.lib.transactions || !this.lib.transactions.length)
      return (wrap.innerHTML = "<div>No transactions yet</div>");
    this.lib.transactions.slice(0, 50).forEach((tx) => {
      const div = document.createElement("div");
      div.className = "tx";
      div.innerHTML = `<div class="transactions-details"><div style="font-weight:600">${tx.action.toUpperCase()} — ${
        this.findItemById(tx.itemId)?.title || "Unknown"
      }</div>
                       <div style="font-size:12px;color:#6b7280">${
                         this.findUserById(tx.userId)?.name || "Unknown user"
                       } • ${new Date(tx.timestamp).toLocaleString()}</div>
                       ${
                         tx.dueDate
                           ? `<div style="font-size:12px;color:${
                               this.isOverdue(this.findItemById(tx.itemId))
                                 ? "#e74c3c"
                                 : "#6b7280"
                             }">Due: ${new Date(
                               tx.dueDate
                             ).toLocaleDateString()}</div></div>`
                           : ""
                       }`;
      wrap.appendChild(div);
    });
  }

  openBorrowModal(item) {
    if (!this.currentUserId) {
      this.notify("Select a user first", "error");
      return;
    }
    const user = this.findUserById(this.currentUserId);
    const maxLimit = user.membershipType === "Premium" ? 10 : 3;
    if ((user.borrowedItems || []).length >= maxLimit) {
      this.notify("User reached borrow limit", "error");
      return;
    }
    if (!item.isAvailable) {
      this.notify("Item not available", "error");
      return;
    }

    this.el.modalItemId.value = item.id;
    this.el.modalItemTitle.textContent = `${item.title} — ${
      item.meta?.author || item.meta?.publisher || item.meta?.director || ""
    }`;
    const min = new Date();
    min.setDate(min.getDate() + 1);
    this.el.dueDate.value = "";
    this.el.dueDate.min = min.toISOString().split("T")[0];

    this.el.modalOverlay.classList.remove("hidden");
  }

  closeModal() {
    this.el.modalOverlay.classList.add("hidden");
  }

  async confirmBorrow() {
    const itemId = Number(this.el.modalItemId.value);
    const dueDate = this.el.dueDate.value;
    if (!dueDate) {
      this.notify("Choose due date", "error");
      return;
    }
    try {
      this.borrowItem(itemId, this.currentUserId, dueDate);
      this.save();
      this._reloadAndNotify("Item borrowed", "success");
      this.closeModal();
    } catch (err) {
      this.notify(err.message || "Error", "error");
    }
  }

  borrowItem(itemId, userId, dueDate) {
    const item = this.findItemById(itemId);
    const user = this.findUserById(userId);
    if (!item) throw new Error("Item not found");
    if (!user) throw new Error("User not found");
    if (!item.isAvailable) throw new Error("Item not available");
    if (
      (user.borrowedItems || []).length >=
      (user.membershipType === "Premium" ? 10 : 3)
    )
      throw new Error("Borrow limit exceeded");

    item.isAvailable = false;
    item.borrowedBy = userId;
    item.dueDate = new Date(dueDate).toISOString();
    user.borrowedItems = user.borrowedItems || [];
    user.borrowedItems.push(item.id);

    const tx = {
      transactionId: (this.lib.transactions[0]?.transactionId || 0) + 1,
      userId,
      itemId: item.id,
      action: "borrow",
      timestamp: new Date().toISOString(),
      dueDate: item.dueDate,
    };
    this.lib.transactions.unshift(tx);
  }

  returnItem(itemId) {
    const item = this.findItemById(itemId);
    if (!item) return this.notify("Item not found", "error");
    if (item.isAvailable) return this.notify("Item already available", "error");

    const user = this.findUserById(item.borrowedBy);
    const prevDue = item.dueDate ? new Date(item.dueDate).toISOString() : null;
    item.isAvailable = true;
    item.borrowedBy = null;
    item.dueDate = null;
    if (user && user.borrowedItems) {
      user.borrowedItems = user.borrowedItems.filter((id) => id !== item.id);
    }
    const tx = {
      transactionId: (this.lib.transactions[0]?.transactionId || 0) + 1,
      userId: user ? user.id : null,
      itemId: item.id,
      action: "return",
      timestamp: new Date().toISOString(),
      dueDate: prevDue,
    };
    this.lib.transactions.unshift(tx);
    this.save();
    this._reloadAndNotify("Item returned", "success");
  }

  findItemById(id) {
    return this.lib.items.find((i) => Number(i.id) === Number(id)) || null;
  }
  findUserById(id) {
    return this.lib.users.find((u) => Number(u.id) === Number(id)) || null;
  }
  getUserBorrowedItems(userId) {
    const user = this.findUserById(userId);
    if (!user || !user.borrowedItems) return [];
    return (user.borrowedItems || [])
      .map((id) => this.findItemById(id))
      .filter(Boolean);
  }

  isOverdue(item) {
    if (!item || !item.dueDate) return false;
    const due = new Date(item.dueDate);
    const today = new Date();
    return new Date(due.toDateString()) < new Date(today.toDateString());
  }

  handleSwitchUser() {
    const id = Number(this.el.userSelect.value);
    if (!id) return this.notify("Select a user", "error");
    this.currentUserId = id;
    localStorage.setItem("lms_selected_user", String(id));
    this.renderUserPanel();
    this.renderBorrowedList();
    this.notify("Switched user", "info");
  }

  renderUserSelect() {
    this.renderUserSelect();
  }

  _reloadAndNotify(message = "Done", type = "success") {
    this.renderAll();
    this.notify(message, type);
  }

  renderAll() {
    this.renderUserSelect();
    this.renderItemsGrid();
    this.renderStats();
    this.renderUserPanel();
    this.renderBorrowedList();
    this.renderTransactions();
  }

  notify(message, type = "info") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = message;
    this.el.toasts.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 350);
    }, 2000);
  }

  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  applyTheme() {
    this.restoreTheme();
  }

  setTheme(name) {
    const root = document.documentElement;
    root.setAttribute("data-theme", name);
    localStorage.setItem(this.themeKey, name);
    this.el.themeToggle.checked = name === "dark";
  }

  restoreTheme() {
    const saved = localStorage.getItem(this.themeKey) || "light";
    this.setTheme(saved);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new LibraryApp();
  setTimeout(() => {
    app.renderUserSelect = function () {
      const sel = app.el.userSelect;
      sel.innerHTML =
        `<option value="">-- Select user --</option>` +
        app.lib.users
          .map(
            (u) =>
              `<option value="${u.id}" ${
                u.id === app.currentUserId ? "selected" : ""
              }>${u.name} (${u.membershipType})</option>`
          )
          .join("");
    };
    app.renderUserSelect();
    app.renderAll();
  }, 50);
});
