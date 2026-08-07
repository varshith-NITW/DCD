// Simulated, Firebase, & MongoDB Atlas Database Engine for Classroom DCD Hub with Authorization

const SEED_USERS = [
  { id: 'admin1818', username: 'admin1818@nitw.ac.in', name: 'DCD Administrator', role: 'Teacher (Admin)', avatar: '🎓', password: 'admin-1818' },
  { id: 'alice', username: 'alice@student.nitw.ac.in', name: 'Alice Smith', role: 'Student', avatar: '👩‍💻', password: 'alice123' },
  { id: 'bob', username: 'bob@student.nitw.ac.in', name: 'Bob Jones', role: 'Student', avatar: '👨‍💻', password: 'bob123' }
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

  // Initialize Database (Using v4 keys to clear any cached data from previous builds)
  init() {
    if (!this.isLocalStorageAvailable()) {
      console.warn("Local storage is disabled or blocked in this browser context. Edits will not persist.");
    }
    
    // Seed localStorage fallbacks if they don't exist
    if (!localStorage.getItem('dcd_users_v4')) {
      localStorage.setItem('dcd_users_v4', JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem('dcd_projects_v4')) {
      localStorage.setItem('dcd_projects_v4', JSON.stringify(SEED_PROJECTS));
    }
  },

  // Check if MongoDB Atlas should be used
  isMongo() {
    return window.DcdMongo && window.DcdMongo.useMongo && window.DcdMongo.app;
  },

  // Check if Firebase should be used
  isFirebase() {
    return window.DcdFirebase && window.DcdFirebase.useFirebase && window.DcdFirebase.db;
  },

  // Get MongoDB Database Instance (authenticated anonymously)
  async getMongoDb() {
    const app = window.DcdMongo.app;
    if (!app.currentUser) {
      await app.logIn(Realm.Credentials.anonymous());
    }
    return app.currentUser.mongoClient("mongodb-atlas").db("dcd_showcase");
  },

  // Get User List (Async)
  async getUsers() {
    this.init();
    
    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        const users = await mongo.collection('users').find({});
        if (users.length === 0) {
          for (const u of SEED_USERS) {
            await mongo.collection('users').insertOne(u);
          }
          return SEED_USERS;
        }
        return users;
      } catch (err) {
        console.error("Error fetching users from MongoDB Atlas: ", err);
      }
    }
    
    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        const snapshot = await window.DcdFirebase.db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        if (users.length === 0) {
          for (const u of SEED_USERS) {
            await window.DcdFirebase.db.collection('users').doc(u.username).set(u);
            users.push(u);
          }
        }
        return users;
      } catch (err) {
        console.error("Error fetching users from Firebase: ", err);
      }
    }
    
    // 3. Local Storage Fallback
    return JSON.parse(localStorage.getItem('dcd_users_v4')) || SEED_USERS;
  },

  // Get Projects (Async)
  async getProjects() {
    this.init();
    
    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        const projects = await mongo.collection('projects').find({});
        return projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (err) {
        console.error("Error fetching projects from MongoDB Atlas: ", err);
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        const snapshot = await window.DcdFirebase.db.collection('projects').orderBy('createdAt', 'desc').get();
        const projects = [];
        snapshot.forEach(doc => projects.push(doc.data()));
        return projects;
      } catch (err) {
        console.error("Error fetching projects from Firebase: ", err);
      }
    }

    // 3. Local Storage Fallback
    return JSON.parse(localStorage.getItem('dcd_projects_v4')) || SEED_PROJECTS;
  },

  // Save all projects locally (helper for fallback mode)
  saveProjectsLocally(projects) {
    localStorage.setItem('dcd_projects_v4', JSON.stringify(projects));
  },

  // Get a single project (Async)
  async getProject(id) {
    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        return await mongo.collection('projects').findOne({ id: id });
      } catch (err) {
        console.error("Error fetching project from MongoDB Atlas: ", err);
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        const doc = await window.DcdFirebase.db.collection('projects').doc(id).get();
        return doc.exists ? doc.data() : null;
      } catch (err) {
        console.error("Error fetching project from Firebase: ", err);
      }
    }

    // 3. Local Storage Fallback
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
      status: projectData.status || 'Under Review',
      rejectedReason: projectData.rejectedReason || '',
      acceptedModifications: projectData.acceptedModifications || '',
      declinedReason: projectData.rejectedReason || ''
    };

    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        await mongo.collection('projects').insertOne(newProject);
        return newProject;
      } catch (err) {
        console.error("Error creating project in MongoDB Atlas: ", err);
        throw new Error("Failed to save project to MongoDB cloud.");
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        await window.DcdFirebase.db.collection('projects').doc(newProjectId).set(newProject);
        return newProject;
      } catch (err) {
        console.error("Error creating Firebase project: ", err);
        throw new Error("Failed to save project to Firebase cloud.");
      }
    }

    // 3. Local Storage Fallback
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
      throw new Error('Unauthorized: You do not have permission to edit this project.');
    }

    const mergedProject = {
      ...project,
      title: updatedData.title !== undefined ? updatedData.title : project.title,
      shortDescription: updatedData.shortDescription !== undefined ? updatedData.shortDescription : project.shortDescription,
      description: updatedData.description !== undefined ? updatedData.description : project.description,
      status: updatedData.status !== undefined ? updatedData.status : (project.status || 'Under Review'),
      rejectedReason: (updatedData.status === 'Declined' || updatedData.status === 'Rejected') ? (updatedData.rejectedReason !== undefined ? updatedData.rejectedReason : (project.rejectedReason || '')) : '',
      acceptedModifications: updatedData.status === 'Accepted' ? (updatedData.acceptedModifications !== undefined ? updatedData.acceptedModifications : (project.acceptedModifications || '')) : '',
      declinedReason: (updatedData.status === 'Declined' || updatedData.status === 'Rejected') ? (updatedData.rejectedReason !== undefined ? updatedData.rejectedReason : (project.rejectedReason || '')) : ''
    };

    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        await mongo.collection('projects').updateOne({ id: id }, { $set: mergedProject });
        return mergedProject;
      } catch (err) {
        console.error("Error updating project in MongoDB Atlas: ", err);
        throw new Error("Failed to edit project in MongoDB cloud.");
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        await window.DcdFirebase.db.collection('projects').doc(id).update(mergedProject);
        return mergedProject;
      } catch (err) {
        console.error("Error updating Firebase project: ", err);
        throw new Error("Failed to edit project in Firebase cloud.");
      }
    }

    // 3. Local Storage Fallback
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
      throw new Error('Unauthorized: You do not have permission to delete this project.');
    }

    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        await mongo.collection('projects').deleteOne({ id: id });
        return;
      } catch (err) {
        console.error("Error deleting project in MongoDB Atlas: ", err);
        throw new Error("Failed to delete project from MongoDB cloud.");
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        await window.DcdFirebase.db.collection('projects').doc(id).delete();
        return;
      } catch (err) {
        console.error("Error deleting Firebase project: ", err);
        throw new Error("Failed to delete project from Firebase cloud.");
      }
    }

    // 3. Local Storage Fallback
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    this.saveProjectsLocally(filtered);
  },

  // Wipe all projects (Admin Only) (Async)
  async wipeAllProjects() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || (currentUser.role !== 'Teacher (Admin)' && !currentUser.username.toLowerCase().startsWith('admin1818'))) {
      throw new Error('Unauthorized: Only administrators can wipe projects.');
    }

    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        await mongo.collection('projects').deleteMany({});
        return;
      } catch (err) {
        console.error("Error wiping projects in MongoDB Atlas: ", err);
        throw new Error("Failed to wipe projects from MongoDB cloud.");
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        const snapshot = await window.DcdFirebase.db.collection('projects').get();
        const batch = window.DcdFirebase.db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return;
      } catch (err) {
        console.error("Error wiping Firebase projects: ", err);
        throw new Error("Failed to wipe projects from Firebase cloud.");
      }
    }

    // 3. Local Storage Fallback
    this.saveProjectsLocally([]);
  },

  // Reset to default seed data (Async)
  async resetDatabase() {
    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      if (confirm("Resetting MongoDB database will clear all cloud projects. Are you sure?")) {
        try {
          const mongo = await this.getMongoDb();
          await mongo.collection('projects').deleteMany({});
          await mongo.collection('users').deleteMany({});
          for (const u of SEED_USERS) {
            await mongo.collection('users').insertOne(u);
          }
        } catch (err) {
          console.error("Error resetting MongoDB database: ", err);
        }
      }
    }
    
    // 2. Try Firebase Firestore
    else if (this.isFirebase()) {
      if (confirm("Resetting Firebase database will clear all cloud projects. Are you sure?")) {
        try {
          const snapshot = await window.DcdFirebase.db.collection('projects').get();
          const batch = window.DcdFirebase.db.batch();
          snapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();

          const userSnapshot = await window.DcdFirebase.db.collection('users').get();
          const userBatch = window.DcdFirebase.db.batch();
          userSnapshot.forEach(doc => userBatch.delete(doc.ref));
          await userBatch.commit();

          for (const u of SEED_USERS) {
            await window.DcdFirebase.db.collection('users').doc(u.username).set(u);
          }
        } catch (err) {
          console.error("Error resetting Firebase cloud database: ", err);
        }
      }
    }
    
    // 3. Local Storage Fallback
    else {
      localStorage.setItem('dcd_users_v4', JSON.stringify(SEED_USERS));
      localStorage.setItem('dcd_projects_v4', JSON.stringify(SEED_PROJECTS));
    }
    
    localStorage.removeItem('dcd_session_v4');
    location.reload();
  },

  // Authentication Logic
  getCurrentUser() {
    this.init();
    const session = localStorage.getItem('dcd_session_v4');
    return session ? JSON.parse(session) : null;
  },

  async login(username, password) {
    this.init();
    let normUsername = username.toLowerCase().trim();
    if (!normUsername.includes('@')) {
      if (normUsername === 'admin1818') {
        normUsername += '@nitw.ac.in';
      } else {
        normUsername += '@student.nitw.ac.in';
      }
    }
    
    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        let user = await mongo.collection('users').findOne({ username: normUsername });
        
        if (!user) {
          const seedMatch = SEED_USERS.find(u => u.username.toLowerCase() === normUsername && u.password === password);
          if (seedMatch) {
            await mongo.collection('users').insertOne(seedMatch);
            user = seedMatch;
          } else {
            throw new Error('Invalid username or password.');
          }
        } else {
          if (user.password !== password) {
            throw new Error('Invalid username or password.');
          }
        }
        
        const sessionUser = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        };

        localStorage.setItem('dcd_session_v4', JSON.stringify(sessionUser));
        window.dispatchEvent(new Event('storage'));
        return sessionUser;
      } catch (err) {
        console.error("MongoDB login error: ", err);
        throw err;
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        const doc = await window.DcdFirebase.db.collection('users').doc(normUsername).get();
        let user;
        
        if (!doc.exists) {
          const seedMatch = SEED_USERS.find(u => u.username.toLowerCase() === normUsername && u.password === password);
          if (seedMatch) {
            await window.DcdFirebase.db.collection('users').doc(normUsername).set(seedMatch);
            user = seedMatch;
          } else {
            throw new Error('Invalid username or password.');
          }
        } else {
          user = doc.data();
          if (user.password !== password) {
            throw new Error('Invalid username or password.');
          }
        }

        const sessionUser = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        };

        localStorage.setItem('dcd_session_v4', JSON.stringify(sessionUser));
        window.dispatchEvent(new Event('storage'));
        return sessionUser;
      } catch (err) {
        console.error("Cloud login error: ", err);
        throw err;
      }
    }

    // 3. Fallback login
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

    localStorage.setItem('dcd_session_v4', JSON.stringify(sessionUser));
    window.dispatchEvent(new Event('storage'));
    return sessionUser;
  },

  logout() {
    localStorage.removeItem('dcd_session_v4');
    window.dispatchEvent(new Event('storage'));
  },

  async register(username, name, password) {
    this.init();
    const normUsername = username.toLowerCase().trim();
    const normName = name.trim().toLowerCase();

    if (!normUsername || !name || !password) {
      throw new Error('All fields are required.');
    }

    // Validate college email domain restriction
    const allowedDomains = ['@student.nitw.ac.in', '@nitw.ac.in'];
    const isCollegeEmail = allowedDomains.some(domain => normUsername.endsWith(domain));
    if (!isCollegeEmail) {
      throw new Error('Registration is restricted to college emails only (@student.nitw.ac.in or @nitw.ac.in).');
    }

    if (normUsername === 'admin1818@nitw.ac.in') {
      throw new Error('This email is reserved for system administration.');
    }

    const users = await this.getUsers();

    // STRICT UNIQUE CHECKS: No duplicate emails or duplicate display names allowed
    if (users.some(u => u.username.toLowerCase() === normUsername)) {
      throw new Error('This email is already registered. Please log in.');
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

    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        await mongo.collection('users').insertOne(newUser);
        return this.login(normUsername, password);
      } catch (err) {
        console.error("MongoDB Atlas registration error: ", err);
        throw new Error("MongoDB cloud registration failed. Try again.");
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        await window.DcdFirebase.db.collection('users').doc(normUsername).set(newUser);
        return this.login(normUsername, password);
      } catch (err) {
        console.error("Cloud registration error: ", err);
        throw new Error("Cloud registration failed. Try again.");
      }
    }

    // 3. Fallback Local Storage
    users.push(newUser);
    localStorage.setItem('dcd_users_v4', JSON.stringify(users));

    return this.login(normUsername, password);
  },

  // Delete a user (Admin Only) (Async)
  async deleteUser(username) {
    const currentUser = this.getCurrentUser();
    if (!currentUser || (currentUser.role !== 'Teacher (Admin)' && !currentUser.username.toLowerCase().startsWith('admin1818'))) {
      throw new Error('Unauthorized: Only administrators can remove users.');
    }

    const normUsername = username.toLowerCase().trim();
    if (normUsername.startsWith('admin1818')) {
      throw new Error('Unauthorized: You cannot remove the system administrator account.');
    }

    // 1. Try MongoDB Atlas
    if (this.isMongo()) {
      try {
        const mongo = await this.getMongoDb();
        await mongo.collection('users').deleteOne({ username: normUsername });
        return;
      } catch (err) {
        console.error("Error deleting user in MongoDB Atlas: ", err);
        throw new Error("Failed to delete user from MongoDB cloud.");
      }
    }

    // 2. Try Firebase Firestore
    if (this.isFirebase()) {
      try {
        await window.DcdFirebase.db.collection('users').doc(normUsername).delete();
        return;
      } catch (err) {
        console.error("Error deleting Firebase user: ", err);
        throw new Error("Failed to delete user from Firebase cloud.");
      }
    }

    // 3. Local Storage Fallback
    const users = await this.getUsers();
    const filtered = users.filter(u => u.username.toLowerCase() !== normUsername);
    localStorage.setItem('dcd_users_v4', JSON.stringify(filtered));
  },

  canEdit(user, project) {
    if (!user) return false;
    // Admins can edit/delete any design module
    if (user.role === 'Teacher (Admin)' || user.username.toLowerCase().startsWith('admin1818')) {
      return true;
    }
    // Students can only edit/delete their own modules
    return project.creatorId === user.id;
  }
};

window.ProjectDb = db;
