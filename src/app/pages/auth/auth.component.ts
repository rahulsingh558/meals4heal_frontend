import { Component, ViewChildren, QueryList, ElementRef, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-auth',
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './auth.html',
    styleUrls: ['./auth.css']
})
export class AuthComponent implements OnInit {
    @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

    isSignUp = false;
    isBrowser = false;

    // Login Form
    loginEmail = '';
    loginPassword = '';
    loginError = '';

    // Signup Form
    signupName = '';
    signupEmail = '';
    signupPassword = '';
    signupConfirmPassword = '';
    signupPhone = '';
    signupAcceptTerms = false;
    signupError = '';

    // WhatsApp/OTP State
    showWhatsAppModal = false;
    whatsappNumber = '';
    countryCode = '+91';

    // Email OTP State
    showEmailModal = false;
    emailForOtp = '';

    // Shared OTP State
    isSendingOtp = false;
    otpSent = false;
    otp: string[] = ['', '', '', '', '', ''];
    resendTimer = 0;
    generatedOTP = '';
    otpInterval: any;
    otpError = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private cartService: CartService,
        private authService: AuthService,
        private cd: ChangeDetectorRef,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit() {
        if (this.authService.isAuthenticated()) {
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/menu';
            this.router.navigate([returnUrl]);
        }

        const url = this.router.url;
        if (url.includes('signup') || url.includes('register')) {
            this.isSignUp = true;
        }
    }

    toggleAuthMode(isSignUp: boolean) {
        this.isSignUp = isSignUp;
        const path = isSignUp ? '/signup' : '/login';
        window.history.pushState({}, '', path);
        this.loginError = '';
        this.signupError = '';
    }

    login() {
        this.loginError = '';

        if (!this.loginEmail || !this.loginPassword) {
            this.loginError = 'Please enter both email and password';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;

        if (!emailRegex.test(this.loginEmail) && !phoneRegex.test(this.loginEmail)) {
            this.loginError = 'Please enter a valid email address or 10-digit phone number';
            return;
        }

        this.authService.login(this.loginEmail, this.loginPassword).subscribe({
            next: () => {
                this.handleAuthSuccess();
                this.cd.detectChanges();
            },
            error: (error) => {
                this.loginError = error.error?.message || 'Login failed. Please try again.';
                this.cd.detectChanges();
            }
        });
    }

    signup() {
        this.signupError = '';

        if (!this.signupName || !this.signupEmail || !this.signupPassword || !this.signupConfirmPassword) {
            this.signupError = 'Please fill in all required fields';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.signupEmail)) {
            this.signupError = 'Please enter a valid email address';
            return;
        }

        if (this.signupPassword.length < 6) {
            this.signupError = 'Password must be at least 6 characters long';
            return;
        }

        if (this.signupPassword !== this.signupConfirmPassword) {
            this.signupError = 'Passwords do not match';
            return;
        }

        if (!this.signupAcceptTerms) {
            this.signupError = 'Please accept the terms and conditions';
            return;
        }

        this.authService.register(this.signupName, this.signupEmail, this.signupPassword, this.signupPhone).subscribe({
            next: () => {
                this.handleAuthSuccess();
                this.cd.detectChanges();
            },
            error: (error) => {
                this.signupError = error.error?.message || 'Registration failed. Please try again.';
                this.cd.detectChanges();
            }
        });
    }

    handleAuthSuccess() {
        this.cartService.migrateGuestCart().subscribe({
            next: () => console.log('Cart migrated'),
            error: (err) => console.error('Error migrating cart:', err),
            complete: () => {
                const queryRedirect = this.route.snapshot.queryParams['returnUrl'];
                const redirect = queryRedirect || localStorage.getItem('redirectAfterLogin') || '/menu';
                localStorage.removeItem('redirectAfterLogin');
                this.router.navigate([redirect]);
            }
        });
    }

    authWithGoogle() {
        window.location.href = `${environment.backendUrl}/api/auth/google`;
    }

    openWhatsAppModal() {
        this.showWhatsAppModal = true;
        this.resetWhatsAppForm();
    }

    closeWhatsAppModal() {
        this.showWhatsAppModal = false;
        this.resetWhatsAppForm();
        if (this.otpInterval) {
            clearInterval(this.otpInterval);
        }
    }

    resetWhatsAppForm() {
        this.whatsappNumber = '';
        this.otpSent = false;
        this.otp = ['', '', '', '', '', ''];
        this.resendTimer = 0;
        this.generatedOTP = '';
        this.otpError = '';
        if (this.otpInterval) {
            clearInterval(this.otpInterval);
        }
    }

    requestOTP() {
        if (!this.whatsappNumber || this.whatsappNumber.length < 10) return;

        const fullPhone = this.countryCode + this.whatsappNumber;
        this.otpError = '';
        this.isSendingOtp = true;

        this.authService.sendWhatsAppOtp(fullPhone).subscribe({
            next: () => {
                this.isSendingOtp = false;
                this.startResendTimer();
                this.otpSent = true;
                this.cd.detectChanges();
                setTimeout(() => this.focusOtpInput(0), 100);
            },
            error: () => {
                this.isSendingOtp = false;
                this.otpError = 'Failed to send OTP. Please try again.';
                this.cd.detectChanges();
            }
        });
    }

    startResendTimer() {
        this.resendTimer = 60;
        this.otpInterval = setInterval(() => {
            if (this.resendTimer > 0) {
                this.resendTimer--;
            } else {
                clearInterval(this.otpInterval);
            }
        }, 1000);
    }

    resendOTP() {
        if (this.otpInterval) clearInterval(this.otpInterval);
        this.requestOTP();
        this.otp = ['', '', '', '', '', ''];
    }

    onOtpInput(event: any, index: number) {
        const input = event.target;
        const value = input.value;

        if (!/^\d*$/.test(value)) {
            this.otp[index] = '';
            return;
        }

        this.otp[index] = value;

        if (value && index < 5) {
            setTimeout(() => this.focusOtpInput(index + 1), 10);
        }

        if (index === 5 && value && this.isOtpComplete()) {
            setTimeout(() => {
                if (this.showEmailModal) {
                    this.verifyEmailOTP();
                } else {
                    this.verifyOTP();
                }
            }, 100);
        }
    }

    onOtpKeyDown(event: KeyboardEvent, index: number) {
        const currentValue = this.otp[index];
        if (event.key === 'Backspace') {
            if (!currentValue && index > 0) {
                event.preventDefault();
                this.otp[index] = '';
                setTimeout(() => this.focusOtpInput(index - 1), 10);
            } else if (currentValue) {
                this.otp[index] = '';
            }
        }
        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            this.focusOtpInput(index - 1);
        }
        if (event.key === 'ArrowRight' && index < 5) {
            event.preventDefault();
            this.focusOtpInput(index + 1);
        }
    }

    onOtpPaste(event: ClipboardEvent) {
        event.preventDefault();
        const pastedData = event.clipboardData?.getData('text/plain').trim();

        if (pastedData && /^\d{6}$/.test(pastedData)) {
            const digits = pastedData.split('');
            for (let i = 0; i < 6; i++) {
                this.otp[i] = digits[i] || '';
            }
            setTimeout(() => this.focusOtpInput(5), 10);
            if (this.isOtpComplete()) {
                setTimeout(() => {
                    if (this.showEmailModal) {
                        this.verifyEmailOTP();
                    } else {
                        this.verifyOTP();
                    }
                }, 100);
            }
        }
    }

    focusOtpInput(index: number) {
        if (this.otpInputs && this.otpInputs.toArray()[index]) {
            this.otpInputs.toArray()[index].nativeElement.focus();
            this.otpInputs.toArray()[index].nativeElement.select();
        }
    }

    isOtpComplete(): boolean {
        return this.otp.every(digit => digit !== '');
    }

    verifyOTP() {
        const enteredOTP = this.otp.join('');
        const fullPhone = this.countryCode + this.whatsappNumber;
        this.otpError = '';

        this.authService.verifyWhatsAppOtp(fullPhone, enteredOTP).subscribe({
            next: () => {
                this.closeWhatsAppModal();
                this.handleAuthSuccess();
                this.cd.detectChanges();
            },
            error: () => {
                this.otpError = 'Invalid OTP. Please try again.';
                this.otp = ['', '', '', '', '', ''];
                this.cd.detectChanges();
                setTimeout(() => this.focusOtpInput(0), 100);
            }
        });
    }

    // --- Email OTP Functionality ---

    openEmailModal() {
        this.showEmailModal = true;
        this.resetEmailForm();
    }

    closeEmailModal() {
        this.showEmailModal = false;
        this.resetEmailForm();
        if (this.otpInterval) {
            clearInterval(this.otpInterval);
        }
    }

    resetEmailForm() {
        this.emailForOtp = '';
        this.otpSent = false;
        this.otp = ['', '', '', '', '', ''];
        this.resendTimer = 0;
        this.otpError = '';
        if (this.otpInterval) {
            clearInterval(this.otpInterval);
        }
    }

    requestEmailOTP() {
        if (!this.emailForOtp) return;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.emailForOtp)) {
            this.otpError = 'Please enter a valid email address';
            return;
        }

        this.otpError = '';
        this.isSendingOtp = true;

        this.authService.sendEmailOtp(this.emailForOtp).subscribe({
            next: () => {
                this.isSendingOtp = false;
                this.startResendTimer();
                this.otpSent = true;
                this.cd.detectChanges();
                setTimeout(() => this.focusOtpInput(0), 100);
            },
            error: () => {
                this.isSendingOtp = false;
                this.otpError = 'Failed to send OTP. Please try again.';
                this.cd.detectChanges();
            }
        });
    }

    resendEmailOTP() {
        if (this.otpInterval) clearInterval(this.otpInterval);
        this.requestEmailOTP();
        this.otp = ['', '', '', '', '', ''];
    }

    verifyEmailOTP() {
        const enteredOTP = this.otp.join('');
        this.otpError = '';

        this.authService.verifyEmailOtp(this.emailForOtp, enteredOTP).subscribe({
            next: () => {
                this.closeEmailModal();
                this.handleAuthSuccess();
                this.cd.detectChanges();
            },
            error: () => {
                this.otpError = 'Invalid OTP. Please try again.';
                this.otp = ['', '', '', '', '', ''];
                this.cd.detectChanges();
                setTimeout(() => this.focusOtpInput(0), 100);
            }
        });
    }
}
