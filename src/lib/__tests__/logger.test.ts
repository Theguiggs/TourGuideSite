describe('logger', () => {
  let origNodeEnv: string | undefined;

  beforeEach(() => {
    origNodeEnv = process.env.NODE_ENV;
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.resetModules();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    jest.restoreAllMocks();
  });

  function setEnv(env: string) {
    (process.env as Record<string, string>).NODE_ENV = env;
  }

  function loadLogger() {
    // Re-import to pick up new NODE_ENV value
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../logger') as typeof import('../logger')).logger;
  }

  it('logs info with SERVICE_NAME prefix in dev mode', () => {
    setEnv('development');
    const log = loadLogger();
    log.info('TestService', 'hello world');
    expect(console.info).toHaveBeenCalledWith('[TestService] hello world');
  });

  it('logs info with context in dev mode', () => {
    setEnv('development');
    const log = loadLogger();
    log.info('TestService', 'with context', { foo: 'bar' });
    expect(console.info).toHaveBeenCalledWith('[TestService] with context', { foo: 'bar' });
  });

  it('does not log info in production', () => {
    setEnv('production');
    const log = loadLogger();
    log.info('TestService', 'should not appear');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('logs warn in all modes', () => {
    const log = loadLogger();
    log.warn('TestService', 'warning msg');
    expect(console.warn).toHaveBeenCalledWith('[TestService] warning msg');
  });

  it('logs error in all modes with context', () => {
    const log = loadLogger();
    log.error('TestService', 'error msg', { code: 500 });
    expect(console.error).toHaveBeenCalledWith('[TestService] error msg', { code: 500 });
  });

  it('redacts sensitive fields in context', () => {
    setEnv('development');
    const log = loadLogger();
    log.info('TestService', 'auth', { password: 'secret123', userId: 'u1', email: 'a@b.com' });
    expect(console.info).toHaveBeenCalledWith('[TestService] auth', {
      password: '[REDACTED]',
      userId: 'u1',
      email: '[REDACTED]',
    });
  });
});
