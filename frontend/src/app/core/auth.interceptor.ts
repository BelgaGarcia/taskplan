import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService); const router = inject(Router); const token = auth.token;
  const authenticated = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  const authCall = /\/auth\/(login|refresh|logout|password)$/.test(request.url);
  return next(authenticated).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status !== 401 || authCall) return throwError(() => error);
    return auth.refresh().pipe(switchMap(newToken => next(request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }))), catchError(refreshError => { auth.logout(); void router.navigateByUrl('/login'); return throwError(() => refreshError); }));
  }));
};
