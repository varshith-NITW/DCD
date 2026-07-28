// Simulated & Cloud Database Engine for Classroom DCD Hub with Authorization

const SEED_USERS = [
  { id: 'teacher', username: 'teacher', name: 'Dr. Sarah Jenkins', role: 'Teacher (Admin)', avatar: '🎓', password: 'teacher123' },
  { id: 'alice', username: 'alice', name: 'Alice Smith', role: 'Student', avatar: '👩‍💻', password: 'alice123' },
  { id: 'bob', username: 'bob', name: 'Bob Jones', role: 'Student', avatar: '👨‍💻', password: 'bob123' }
];

// Seed projects is empty by default so the interface starts completely clean
const SEED_PROJECTS = [];

const db = {
  // Check if localStorage is functional
  isLocalStorageAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Initialize Database
  init() {
    if (!this.isLocalStorageAvailable()) {
      console.warn("Local storage is disabled or blocked in this browser context (possibly due to direct file:// access in incognito mode). Edits will not persist across refreshes.");
    }
    
    // Seed localStorage fallbacks if they don't exist
    if (!localStorage.getItem('dcd_users_v3')) {
      localStorage.setItem('dcd_users_v3', JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem('dcd_projects_v3')) {
      localStorage.setItem('dcd_projects_v3', JSON.stringify(SEED_PROJECTS));
    }
  },

  // Check if Firestore should be used
  isCloud() {
    return window.DcdFirebase && window.DcdFirebase.useFirebase && window.DcdFirebase.db;
  },

  // Get User List (Async)
  async getUsers() {
    this.init();
    if (this.isCloud()) {
      try {
        const snapshot = await window.DcdFirebase.db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        // If Firestore users collection is empty (e.g. fresh database), seed it
        if (users.length === 0) {
          for (const u of SEED_USERS) {
            await window.DcdFirebase.db.collection('users').doc(u.username).set(u);
            users.push(u);
          }
        }
        return users;
      } catch (err) {
        console.error("Error fetching users from cloud: ", err);
      }
    }
    // Fallback to local storage
    return JSON.parse(localStorage.getItem('dcd_users_v3')) || SEED_USERS;
  },

  // Get Projects (Async)
  async getProjects() {
    this.init();
    if (this.isCloud()) {
      try {
        const snapshot = await window.DcdFirebase.db.collection('projects').orderBy('createdAt', 'desc').get();
        const projects = [];
        snapshot.forEach(doc => projects.push(doc.data()));
        return projects;
      } catch (err) {
        console.error("Error fetching projects from cloud: ", err);
      }
    }
    // Fallback to local storage
    return JSON.parse(localStorage.getItem('dcd_projects_v3')) || SEED_PROJECTS;
  },

  // Save all projects locally (helper for fallback mode)
  saveProjectsLocally(projects) {
    localStorage.setItem('dcd_projects_v3', JSON.stringify(projects));
  },

  // Get a single project (Async)
  async getProject(id) {
    if (this.isCloud()) {
      try {
        const doc = await window.DcdFirebase.db.collection('projects').doc(id).get();
        return doc.exists ? doc.data() : null;
      } catch (err) {
        console.error("Error fetching project from cloud: ", err);
      }
    }
    const projects = await this.getProjects();
    return projects.find(p => p.id === id);
  },

  // Add a new project (Async)
  async createProject(projectData) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to create a project.');
    }

    const newProjectId = 'proj-' + Math.random().toString(36).substr(2, 9);
    const newProject = {
      id: newProjectId,
      title: projectData.title || 'Untitled Project',
      shortDescription: projectData.shortDescription || '',
      description: projectData.description || '',
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      createdAt: new Date().toISOString(),
      tags: projectData.tags || [],
      imageUrl: projectData.imageUrl || 'https://images.unsplash.com/photo-1601662528567-526cd06f6582?auto=format&fit=crop&w=800&q=80',
      externalLink: projectData.externalLink || ''
    };

    if (this.isCloud()) {
      try {
        await window.DcdFirebase.db.collection('projects').doc(newProjectId).set(newProject);
        return newProject;
      } catch (err) {
        console.error("Error creating cloud project: ", err);
        throw new Error("Failed to save project to the cloud. Try again.");
      }
    }

    // Fallback
    const projects = await this.getProjects();
    projects.unshift(newProject);
    this.saveProjectsLocally(projects);
    return newProject;
  },

  // Update an existing project (Async)
  async updateProject(id, updatedData) {
    const currentUser = this.getCurrentUser();
    const project = await this.getProject(id);
    
    if (!project) {
      throw new Error('Project not found');
    }

    if (!this.canEdit(currentUser, project)) {
      throw new Error('Unauthorized: You must be logged in to edit projects.');
    }

    const mergedProject = {
      ...project,
      title: updatedData.title !== undefined ? updatedData.title : project.title,
      shortDescription: updatedData.shortDescription !== undefined ? updatedData.shortDescription : project.shortDescription,
      description: updatedData.description !== undefined ? updatedData.description : project.description,
      tags: updatedData.tags !== undefined ? updatedData.tags : project.tags,
      imageUrl: updatedData.imageUrl !== undefined ? updatedData.imageUrl : project.imageUrl,
      externalLink: updatedData.externalLink !== undefined ? updatedData.externalLink : project.externalLink
    };

    if (this.isCloud()) {
      try {
        await window.DcdFirebase.db.collection('projects').doc(id).update(mergedProject);
        return mergedProject;
      } catch (err) {
        console.error("Error updating cloud project: ", err);
        throw new Error("Failed to edit project in the cloud.");
      }
    }

    // Fallback
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
      projects[index] = mergedProject;
      this.saveProjectsLocally(projects);
    }
    return mergedProject;
  },

  // Delete a project (Async)
  async deleteProject(id) {
    const currentUser = this.getCurrentUser();
    const project = await this.getProject(id);
    if (!project) return;

    if (!this.canEdit(currentUser, project)) {
      throw new Error('Unauthorized: You must be logged in to delete projects.');
    }

    if (this.isCloud()) {
      try {
        await window.DcdFirebase.db.collection('projects').doc(id).delete();
        return;
      } catch (err) {
        console.error("Error deleting cloud project: ", err);
        throw new Error("Failed to delete project from the cloud.");
      }
    }

    // Fallback
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    this.saveProjectsLocally(filtered);
  },

  // Reset to default seed data (Async)
  async resetDatabase() {
    if (this.isCloud()) {
      if (confirm("Resetting database will clear all cloud projects. Are you sure?")) {
        try {
          const snapshot = await window.DcdFirebase.db.collection('projects').get();
          const batch = window.DcdFirebase.db.batch();
          snapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();

          // Reset users collection to default seed users
          const userSnapshot = await window.DcdFirebase.db.collection('users').get();
          const userBatch = window.DcdFirebase.db.batch();
          userSnapshot.forEach(doc => userBatch.delete(doc.ref));
          await userBatch.commit();

          for (const u of SEED_USERS) {
            await window.DcdFirebase.db.collection('users').doc(u.username).set(u);
          }
        } catch (err) {
          console.error("Error resetting cloud database: ", err);
        }
      }
    } else {
      localStorage.setItem('dcd_users_v3', JSON.stringify(SEED_USERS));
      localStorage.setItem('dcd_projects_v3', JSON.stringify(SEED_PROJECTS));
    }
    localStorage.removeItem('dcd_session_v3');
    location.reload();
  },

  // Authentication Logic
  getCurrentUser() {
    this.init();
    const session = localStorage.getItem('dcd_session_v3');
    return session ? JSON.parse(session) : null;
  },

  async login(username, password) {
    this.init();
    const normUsername = username.toLowerCase().trim();
    
    if (this.isCloud()) {
      try {
        const doc = await window.DcdFirebase.db.collection('users').doc(normUsername).get();
        if (!doc.exists) {
          throw new Error('Invalid username or password.');
        }
        const user = doc.data();
        if (user.password !== password) {
          throw new Error('Invalid username or password.');
        }

        const sessionUser = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        };

        localStorage.setItem('dcd_session_v3', JSON.stringify(sessionUser));
        window.dispatchEvent(new Event('storage'));
        return sessionUser;
      } catch (err) {
        console.error("Cloud login error: ", err);
        throw err;
      }
    }

    // Fallback login
    const users = await this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === normUsername);
    
    if (!user || user.password !== password) {
      throw new Error('Invalid username or password.');
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    };

    localStorage.setItem('dcd_session_v3', JSON.stringify(sessionUser));
    window.dispatchEvent(new Event('storage'));
    return sessionUser;
  },

  logout() {
    localStorage.removeItem('dcd_session_v3');
    window.dispatchEvent(new Event('storage'));
  },

  async register(username, name, password) {
    this.init();
    const normUsername = username.toLowerCase().trim();
    const normName = name.trim().toLowerCase();

    if (!normUsername || !name || !password) {
      throw new Error('All fields are required.');
    }

    const users = await this.getUsers();

    // STRICT UNIQUE CHECKS: No duplicate usernames or duplicate display names allowed
    if (users.some(u => u.username.toLowerCase() === normUsername)) {
      throw new Error('Username is already taken. Please choose a unique username.');
    }
    if (users.some(u => u.name.toLowerCase() === normName)) {
      throw new Error('This display name is already in use by another classmate. Please use your unique name.');
    }

    const avatars = ['👩‍💻', '👨‍💻', '👤', '⚡', '🌟', '🎨'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const newUser = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      username: normUsername,
      name: name.trim(),
      role: 'Student',
      avatar: randomAvatar,
      password: password
    };

    if (this.isCloud()) {
      try {
        await window.DcdFirebase.db.collection('users').doc(normUsername).set(newUser);
        return this.login(normUsername, password);
      } catch (err) {
        console.error("Cloud registration error: ", err);
        throw new Error("Cloud registration failed. Try again.");
      }
    }

    // Fallback
    users.push(newUser);
    localStorage.setItem('dcd_users_v3', JSON.stringify(users));

    return this.login(normUsername, password);
  },

  canEdit(user, project) {
    return !!user;
  }
};

window.ProjectDb = db;
