import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { UserService } from './user-serve';

export class AuthService {
  private userService: UserService;

  constructor(private server: FastifyInstance) {
    this.userService = new UserService(server);
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = this.server.jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token: token,
      user: userWithoutPassword,
    };
  }
}