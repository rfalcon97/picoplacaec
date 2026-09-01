import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    const user = config.get<string>('GMAIL_USER');
    const pass = config.get<string>('GMAIL_APP_PASSWORD');
    this.fromAddress = user ?? 'no-reply@picoplaca.ec';

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"Pico y Placa EC" <${this.fromAddress}>`,
      to: email,
      subject: 'Código para recuperar tu contraseña',
      text: `Tu código de recuperación es: ${code}\n\nExpira en 15 minutos. Si no solicitaste esto, ignora este correo.`,
      html: `<p>Tu código de recuperación es:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
        <p>Expira en 15 minutos. Si no solicitaste esto, ignora este correo.</p>`,
    });
    this.logger.log(`Password reset code sent to ${email}`);
  }
}
