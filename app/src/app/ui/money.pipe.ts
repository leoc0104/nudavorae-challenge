import { Pipe, PipeTransform } from '@angular/core';

/**
 * price_cents is an integer and no decimal crosses the wire, so the only place
 * cents become a price is here.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private static readonly format = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  transform(cents: number): string {
    return MoneyPipe.format.format(cents / 100);
  }
}
