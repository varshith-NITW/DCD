// Simulated DB Engine for Classroom DCD Hub with Authorization

const SEED_USERS = [
  { id: 'teacher', username: 'teacher', name: 'Dr. Sarah Jenkins', role: 'Teacher (Admin)', avatar: '🎓', password: 'teacher123' },
  { id: 'alice', username: 'alice', name: 'Alice Smith', role: 'Student', avatar: '👩‍💻', password: 'alice123' },
  { id: 'bob', username: 'bob', name: 'Bob Jones', role: 'Student', avatar: '👨‍💻', password: 'bob123' }
];

// Seed projects is empty by default so the interface starts completely clean.
const SEED_PROJECTS = [];

// Database Functions
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

  // Initialize Database (Using v3 keys to clear any cached data from previous builds)
  init() {
    if (!this.isLocalStorageAvailable()) {
      console.warn("Local storage is disabled or blocked in this browser context (possibly due to direct file:// access in incognito mode). Edits will not persist across refreshes.");
    }
    
    if (!localStorage.getItem('dcd_users_v3')) {
      localStorage.setItem('dcd_users_v3', JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem('dcd_projects_v3')) {
      localStorage.setItem('dcd_projects_v3', JSON.stringify(SEED_PROJECTS));
    }
  },

  // Get User List
  getUsers() {
    this.init();
    return JSON.parse(localStorage.getItem('dcd_users_v3')) || SEED_USERS;
  },

  // Get Projects
  getProjects() {
    this.init();
    return JSON.parse(localStorage.getItem('dcd_projects_v3')) || SEED_PROJECTS;
  },

  // Save all projects
  saveProjects(projects) {
    localStorage.setItem('dcd_projects_v3', JSON.stringify(projects));
  },

  // Get a single project
  getProject(id) {
    const projects = this.getProjects();
    return projects.find(p => p.id === id);
  },

  // Add a new project
  createProject(projectData) {
    const projects = this.getProjects();
    const currentUser = this.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('You must be logged in to create a project.');
    }

    const newProject = {
      id: 'proj-' + Math.random().toString(36).substr(2, 9),
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

    projects.unshift(newProject);
    this.saveProjects(projects);
    return newProject;
  },

  // Update an existing project
  updateProject(id, updatedData) {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Project not found');
    }

    const currentUser = this.getCurrentUser();
    const project = projects[index];

    if (!this.canEdit(currentUser, project)) {
      throw new Error('Unauthorized: You must be logged in to edit projects.');
    }

    projects[index] = {
      ...project,
      title: updatedData.title !== undefined ? updatedData.title : project.title,
      shortDescription: updatedData.shortDescription !== undefined ? updatedData.shortDescription : project.shortDescription,
      description: updatedData.description !== undefined ? updatedData.description : project.description,
      tags: updatedData.tags !== undefined ? updatedData.tags : project.tags,
      imageUrl: updatedData.imageUrl !== undefined ? updatedData.imageUrl : project.imageUrl,
      externalLink: updatedData.externalLink !== undefined ? updatedData.externalLink : project.externalLink
    };

    this.saveProjects(projects);
    return projects[index];
  },

  // Delete a project
  deleteProject(id) {
    const projects = this.getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const currentUser = this.getCurrentUser();
    if (!this.canEdit(currentUser, project)) {
      throw new Error('Unauthorized: You must be logged in to delete projects.');
    }

    const filtered = projects.filter(p => p.id !== id);
    this.saveProjects(filtered);
  },

  // Reset to default seed data
  resetDatabase() {
    localStorage.setItem('dcd_users_v3', JSON.stringify(SEED_USERS));
    localStorage.setItem('dcd_projects_v3', JSON.stringify(SEED_PROJECTS));
    localStorage.removeItem('dcd_session_v3');
    location.reload();
  },

  // Authentication Logic
  getCurrentUser() {
    this.init();
    const session = localStorage.getItem('dcd_session_v3');
    return session ? JSON.parse(session) : null;
  },

  login(username, password) {
    this.init();
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    
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

  switchUser(userId) {
    this.init();
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

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

  register(username, name, password) {
    this.init();
    const users = this.getUsers();
    
    const normUsername = username.toLowerCase().trim();
    const normName = name.trim().toLowerCase();

    if (!normUsername || !name || !password) {
      throw new Error('All fields are required.');
    }

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

    users.push(newUser);
    localStorage.setItem('dcd_users_v3', JSON.stringify(users));

    return this.login(normUsername, password);
  },

  canEdit(user, project) {
    return !!user;
  }
};

window.ProjectDb = db;
