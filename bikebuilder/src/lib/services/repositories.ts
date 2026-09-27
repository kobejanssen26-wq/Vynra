import { ALL_COMPONENTS, getComponent, listComponents } from "../catalog";
import { COMMENTS, COMMUNITY_BUILDS, getUser, getUserByUsername, USERS } from "../community/data";
import type {
  BikeComponent,
  Build,
  CategoryId,
  Comment,
  CommunityBuild,
  Discipline,
  Notification,
  User,
} from "../types";

/**
 * Service boundaries.
 *
 * The prototype runs entirely on in-memory seed data plus browser storage for
 * the current user's builds. Each interface below is where a real backend
 * (Postgres/Prisma, Supabase, an auth provider, a notification service) plugs
 * in — the UI only depends on these shapes.
 */

export interface ComponentRepository {
  get(id: string): Promise<BikeComponent | undefined>;
  list(filter: { discipline: Discipline; category?: CategoryId; brand?: string }): Promise<BikeComponent[]>;
  search(query: string): Promise<BikeComponent[]>;
}

export interface BuildRepository {
  get(id: string): Promise<CommunityBuild | undefined>;
  listPublic(filter?: { discipline?: Discipline; authorId?: string }): Promise<CommunityBuild[]>;
  save(build: Build, userId: string): Promise<Build>;
  publish(buildId: string, userId: string): Promise<CommunityBuild>;
}

export interface UserRepository {
  get(id: string): Promise<User | undefined>;
  byUsername(username: string): Promise<User | undefined>;
  follow(followerId: string, targetId: string): Promise<void>;
}

export interface SocialRepository {
  like(buildId: string, userId: string): Promise<void>;
  comments(buildId: string): Promise<Comment[]>;
  addComment(buildId: string, userId: string, body: string): Promise<Comment>;
}

export interface AuthService {
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
}

export interface NotificationService {
  list(userId: string): Promise<Notification[]>;
  markRead(ids: string[]): Promise<void>;
}

const notImplemented = (what: string) => () => Promise.reject(new Error(`${what} requires a backend — not implemented in the prototype.`));

export const memoryComponents: ComponentRepository = {
  get: async (id) => getComponent(id),
  list: async ({ discipline, category, brand }) =>
    listComponents(discipline, category).filter((c) => !brand || c.brand === brand),
  search: async (query) => {
    const t = query.toLowerCase();
    return ALL_COMPONENTS.filter((c) => `${c.brand} ${c.model}`.toLowerCase().includes(t));
  },
};

export const memoryBuilds: BuildRepository = {
  get: async (id) => COMMUNITY_BUILDS.find((b) => b.id === id),
  listPublic: async (f = {}) =>
    COMMUNITY_BUILDS.filter((b) => (!f.discipline || b.discipline === f.discipline) && (!f.authorId || b.authorId === f.authorId)),
  save: notImplemented("Saving builds to an account"),
  publish: notImplemented("Publishing builds"),
};

export const memoryUsers: UserRepository = {
  get: async (id) => getUser(id),
  byUsername: async (u) => getUserByUsername(u),
  follow: notImplemented("Following users"),
};

export const memorySocial: SocialRepository = {
  like: notImplemented("Likes"),
  comments: async (buildId) => COMMENTS.filter((c) => c.buildId === buildId),
  addComment: notImplemented("Comments"),
};

export const ALL_USERS = USERS;
