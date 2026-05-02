import { Component, computed, input } from '@angular/core';
import { Tag } from 'primeng/tag';

/**
 * Native PrimeNG tag severities + our app-specific extensions.
 * `pink` is a sister of `warn`/`danger` for the female-marker case.
 */
export type AppTagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast'
  | 'pink'
  | null
  | undefined;

type NativeSeverity = Exclude<AppTagSeverity, 'pink'>;

/**
 * Thin wrapper around <p-tag> that mirrors its public API and adds a
 * `pink` severity. When `severity === 'pink'` we render a native tag
 * with no severity (so PrimeNG applies its neutral base styles) and
 * tag on the `app-tag-pink` class — picked up by global SCSS.
 */
@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [Tag],
  template: `
    <p-tag
      [value]="value()"
      [icon]="icon() ?? ''"
      [severity]="resolvedSeverity()"
      [rounded]="rounded()"
      [style]="style() ?? null"
      [styleClass]="resolvedStyleClass()" />
  `,
})
export class AppTag {
  readonly value = input<string | undefined>();
  readonly icon = input<string | undefined>();
  readonly severity = input<AppTagSeverity>(undefined);
  readonly rounded = input<boolean>(false);
  readonly style = input<{ [key: string]: string } | undefined>();
  readonly styleClass = input<string | undefined>();

  protected readonly resolvedSeverity = computed<NativeSeverity>(() => {
    const s = this.severity();
    return s === 'pink' ? undefined : (s as NativeSeverity);
  });

  protected readonly resolvedStyleClass = computed<string>(() => {
    const base = this.styleClass()?.trim() ?? '';
    if (this.severity() === 'pink') {
      return base ? `${base} app-tag-pink` : 'app-tag-pink';
    }
    return base;
  });
}
