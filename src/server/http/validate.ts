import { isValidEmail, LIMITS } from '@/lib/auth/policy';
import { badRequest, invalidInput } from '@/server/http/errors';

/**
 * Field validation that produces form-shaped errors.
 *
 * Every field is checked before anything is rejected, so a sign-up form with three
 * problems reports three problems instead of one per round trip. Nothing here
 * trusts a body's declared shape: a value is read as `unknown` and either matches
 * what was asked for or becomes an error message.
 */
export class Fields {
  private readonly body: Record<string, unknown>;
  private readonly errors: Record<string, string>;
  private readonly path: string;

  constructor(body: unknown, inherited?: { errors: Record<string, string>; path: string }) {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw badRequest('Expected a JSON object.');
    }
    this.body = body as Record<string, unknown>;
    // A nested group shares its parent's error map, so `assert()` on the root
    // reports problems from every level with dotted names.
    this.errors = inherited?.errors ?? {};
    this.path = inherited?.path ?? '';
  }

  /** Records a problem discovered outside this class, e.g. a taken username. */
  reject(name: string, message: string): void {
    const key = this.path ? `${this.path}.${name}` : name;
    this.errors[key] ??= message;
  }

  /** Throws once, with everything that was wrong. */
  assert(): void {
    if (Object.keys(this.errors).length > 0) throw invalidInput(this.errors);
  }

  private raw(name: string): unknown {
    return this.body[name];
  }

  string(name: string, options: { min?: number; max: number; label?: string }): string {
    const value = this.raw(name);
    const label = options.label ?? 'This field';
    if (typeof value !== 'string') {
      this.reject(name, `${label} is required.`);
      return '';
    }
    // Trimming happens before length checks so a field of spaces is empty rather
    // than "long enough".
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      this.reject(name, `${label} is required.`);
      return '';
    }
    if (options.min !== undefined && trimmed.length < options.min) {
      this.reject(name, `${label} must be at least ${options.min} characters.`);
    }
    if (trimmed.length > options.max) {
      this.reject(name, `${label} must be at most ${options.max} characters.`);
    }
    return trimmed;
  }

  /** Absent stays absent; an empty string is a deliberate "clear this field". */
  optionalString(name: string, options: { max: number; label?: string }): string | undefined {
    const value = this.raw(name);
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      this.reject(name, `${options.label ?? 'This field'} is not valid.`);
      return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length > options.max) {
      this.reject(name, `${options.label ?? 'This field'} must be at most ${options.max} characters.`);
    }
    return trimmed;
  }

  email(name = 'email'): string {
    const value = this.raw(name);
    if (typeof value !== 'string' || value.trim().length === 0) {
      this.reject(name, 'Enter your email address.');
      return '';
    }
    const normalised = value.trim().toLowerCase();
    if (!isValidEmail(normalised)) {
      this.reject(name, 'That does not look like an email address.');
    }
    return normalised;
  }

  /**
   * A password as typed.
   *
   * Never trimmed — a leading or trailing space is part of the password, and
   * silently removing it would mean a password manager's stored value stops
   * working. Strength is judged by the shared policy, not here.
   */
  password(name = 'password'): string {
    const value = this.raw(name);
    if (typeof value !== 'string' || value.length === 0) {
      this.reject(name, 'Enter a password.');
      return '';
    }
    if (value.length > LIMITS.passwordMax) {
      this.reject(name, `Use at most ${LIMITS.passwordMax} characters.`);
      return '';
    }
    return value;
  }

  boolean(name: string, fallback = false): boolean {
    const value = this.raw(name);
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null) return fallback;
    this.reject(name, 'Expected true or false.');
    return fallback;
  }

  /** One of a fixed set, falling back when absent. */
  oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
    const value = this.raw(name);
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
    this.reject(name, 'That option is not available.');
    return fallback;
  }

  /** A nested object for grouped payloads such as preferences. */
  group(name: string): Fields {
    const value = this.raw(name);
    const path = this.path ? `${this.path}.${name}` : name;
    if (value === undefined || value === null) {
      return new Fields({}, { errors: this.errors, path });
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      this.reject(name, 'Expected an object.');
      return new Fields({}, { errors: this.errors, path });
    }
    return new Fields(value, { errors: this.errors, path });
  }
}
