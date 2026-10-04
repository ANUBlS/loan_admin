// Mirrors the API's admin_schemas.py (camelCase JSON).

export type Role = 'admin' | 'operator' | 'viewer';
export type LoanType = 'consumer' | 'car' | 'mortgage' | 'business';
export type LoanState = 'overdue' | 'active' | 'closed';
export type InstallmentStatus = 'paid' | 'overdue' | 'next' | 'upcoming';
export type PaymentMethod = 'app' | 'cash' | 'bank_transfer' | 'card';
export type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';

export interface Page<T> { items: T[]; total: number; limit: number; offset: number }

export interface AdminUser {
  id: string; username: string; fullName: string; role: Role; isActive: boolean;
  mustChangePassword: boolean; lastLoginAt: string | null; lockedUntil: string | null;
  createdAt: string;
}
export interface AdminToken { accessToken: string; expiresIn: number; admin: AdminUser }

export interface MonthTotal { month: string; count: number; amount: number }
export interface Dashboard {
  customersTotal: number; customersBlocked: number; loansOpen: number; loansOverdue: number;
  loansClosed: number; outstandingPrincipal: number; overdueAmount: number;
  paymentsTodayCount: number; paymentsTodayAmount: number; paymentsMonthAmount: number;
  applicationsPending: number; collectionsByMonth: MonthTotal[]; currency: string;
}

export interface Product {
  id: number; code: string; type: LoanType; nameKey: string; loanNameKey: string;
  annualRate: number; minAmount: number; maxAmount: number; step: number;
  minTerm: number; maxTerm: number; isActive: boolean; sortOrder: number;
}

export interface Customer {
  id: string; phone: string; fullName: string; language: string; isActive: boolean;
  createdAt: string; loansTotal: number; loansOpen: number; loansOverdue: number;
  outstandingPrincipal: number; activeSessions: number;
}

export interface Installment {
  id?: number; number: number; dueDate: string; principal: number; interest: number;
  total: number; balanceAfter: number; paidDate: string | null; status: InstallmentStatus;
  paymentId?: string | null; paymentReference?: string | null;
}

export interface Loan {
  id: string; type: LoanType; productName: string; contractNo: string; currency: string;
  amount: number; annualRate: number; termMonths: number; startDate: string;
  finalPaymentDate: string | null; state: LoanState; monthlyPayment: number;
  paidCount: number; paidTotal: number; paidPrincipal: number; outstandingPrincipal: number;
  overdueCount: number; overdueAmount: number;
  firstUnpaid: Installment | null; nextInstallment: Installment | null;
  userId: string; userPhone: string; userFullName: string; productId: number;
  applicationId: string | null; createdAt: string;
}
export interface LoanDetail extends Loan { schedule: Installment[]; principalDifference: number }

export interface Payment {
  id: string; reference: string; loanId: string; contractNo: string; userId: string;
  userPhone: string; userFullName: string; installmentNumber: number; amount: number;
  currency: string; paidAt: string; method: PaymentMethod; note: string | null;
  createdBy: string | null; reversedAt: string | null; reversedBy: string | null;
  reversalReason: string | null; createdAt: string;
}

export interface DocumentItem {
  id: string; loanId: string; nameKey: string; fileName: string; contentType: string;
  sizeBytes: number; sortOrder: number; createdAt: string;
}

export interface Application {
  id: string; reference: string; type: LoanType; productName: string; amount: number;
  termMonths: number; annualRate: number; monthlyPayment: number; purpose: string;
  currency: string; status: ApplicationStatus; decisionNote: string | null; createdAt: string;
  decidedAt: string | null; loanId: string | null; userId: string; userPhone: string;
  userFullName: string;
}

export interface AuditEntry {
  id: number; adminId: string | null; adminUsername: string; action: string; entity: string;
  entityId: string | null; details: Record<string, unknown> | null; ip: string | null;
  createdAt: string;
}
