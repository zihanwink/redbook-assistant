import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function writeJSON(file, data) {
  const p = path.join(DATA_DIR, file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

const jsonDb = {
  users: readJSON('users.json'),
  topics: readJSON('topics.json'),
  favorites: readJSON('favorites.json'),
  plans: readJSON('plans.json'),

  _nextId(collection) {
    const items = this[collection];
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  },

  _save(collection) {
    writeJSON(collection + '.json', this[collection]);
  },

  // All methods are async-compatible (return values directly, work with await)
  async findUserByUsername(username) {
    return this.users.find(u => u.username === username);
  },
  async findUserById(id) {
    return this.users.find(u => u.id === id);
  },
  async findUserByPhone(phone) {
    return this.users.find(u => u.phone === phone);
  },
  async createUser(user) {
    user.id = this._nextId('users');
    user.created_at = new Date().toISOString();
    this.users.push(user);
    this._save('users');
    return user;
  },
  async updateUser(id, updates) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    this._save('users');
    return this.users[idx];
  },

  async getTopicsByUser(userId) {
    return this.topics.filter(t => t.user_id === userId);
  },
  async findTopicById(id) {
    return this.topics.find(t => t.id === id);
  },
  async createTopic(topic) {
    topic.id = this._nextId('topics');
    topic.created_at = new Date().toISOString();
    this.topics.push(topic);
    this._save('topics');
    return topic;
  },
  async updateTopic(id, updates) {
    const idx = this.topics.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.topics[idx] = { ...this.topics[idx], ...updates };
    this._save('topics');
    return this.topics[idx];
  },
  async deleteTopic(id) {
    this.topics = this.topics.filter(t => t.id !== id);
    this.favorites = this.favorites.filter(f => f.topic_id !== id);
    this.plans = this.plans.filter(p => p.topic_id !== id);
    this._save('topics');
    this._save('favorites');
    this._save('plans');
  },

  async getFavoritesByUser(userId) {
    return this.favorites.filter(f => f.user_id === userId);
  },
  async toggleFavorite(userId, topicId) {
    const idx = this.favorites.findIndex(f => f.user_id === userId && f.topic_id === topicId);
    if (idx > -1) {
      this.favorites.splice(idx, 1);
      this._save('favorites');
      return false;
    }
    this.favorites.push({ id: this._nextId('favorites'), user_id: userId, topic_id: topicId, created_at: new Date().toISOString() });
    this._save('favorites');
    return true;
  },

  async getPlansByUser(userId) {
    return this.plans.filter(p => p.user_id === userId);
  },
  async togglePlan(userId, topicId) {
    const idx = this.plans.findIndex(p => p.user_id === userId && p.topic_id === topicId);
    if (idx > -1) {
      this.plans.splice(idx, 1);
      this._save('plans');
      return false;
    }
    this.plans.push({ id: this._nextId('plans'), user_id: userId, topic_id: topicId, status: 'pending', created_at: new Date().toISOString() });
    this._save('plans');
    return true;
  },

  // Admin methods
  async getAllUsers() {
    return this.users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
  },
  async deleteUser(id) {
    this.users = this.users.filter(u => u.id !== id);
    this._save('users');
    this.favorites = this.favorites.filter(f => f.user_id !== id);
    this.plans = this.plans.filter(p => p.user_id !== id);
    this._save('favorites');
    this._save('plans');
  },
  async getStats() {
    return {
      users: this.users.length,
      topics: this.topics.length,
      favorites: this.favorites.length,
      plans: this.plans.length,
    };
  },
};

export default jsonDb;
