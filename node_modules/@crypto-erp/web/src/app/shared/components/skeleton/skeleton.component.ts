import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'text' | 'title' | 'subtitle' | 'card' | 'circle' | 'button';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="skeletonClass" [style.height.px]="height" [style.width]="widthStyle"></div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--gray-200) 25%,
        var(--gray-100) 50%,
        var(--gray-200) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: var(--radius-md);
    }

    .skeleton-text {
      height: 1rem;
      margin-bottom: 0.5rem;
    }

    .skeleton-title {
      height: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .skeleton-subtitle {
      height: 1rem;
      margin-bottom: 0.5rem;
    }

    .skeleton-card {
      height: 200px;
      width: 100%;
    }

    .skeleton-circle {
      border-radius: 50%;
    }

    .skeleton-button {
      height: 2.5rem;
      width: 120px;
    }

    @keyframes skeleton-loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `],
})
export class SkeletonComponent {
  @Input() type: SkeletonType = 'text';
  @Input() width?: string | number;
  @Input() height?: number;
  @Input() count = 1;

  get skeletonClass(): string {
    return `skeleton skeleton-${this.type}`;
  }

  get widthStyle(): string {
    if (this.width === undefined) {
      return this.getDefaultWidth();
    }
    return typeof this.width === 'number' ? `${this.width}px` : this.width;
  }

  private getDefaultWidth(): string {
    const widths = {
      text: '100%',
      title: '60%',
      subtitle: '40%',
      card: '100%',
      circle: '40px',
      button: '120px',
    };
    return widths[this.type];
  }
}
