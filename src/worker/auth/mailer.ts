export interface Mailer {
  sendOtp(email: string, code: string): Promise<{ success: boolean; previewCode?: string }>;
}

export class DemoMailer implements Mailer {
  private demoMode: boolean;

  constructor(demoMode: boolean) {
    this.demoMode = demoMode;
  }

  async sendOtp(email: string, code: string): Promise<{ success: boolean; previewCode?: string }> {
    console.log(`[DemoMailer] OTP for ${email}: ${code}`);
    return {
      success: true,
      previewCode: this.demoMode ? code : undefined,
    };
  }
}

export class CloudflareEmailMailer implements Mailer {
  async sendOtp(email: string, _code: string): Promise<{ success: boolean; previewCode?: string }> {
    // Cloudflare Email Sending stub (enabled when CF email binding is provisioned)
    console.log(`[CloudflareEmailMailer] Dispatching OTP email to ${email}`);
    return {
      success: true,
    };
  }
}
