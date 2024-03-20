import {AfterViewInit, Component, ElementRef, HostListener, viewChild} from '@angular/core';
import {ModalOptions} from "../../types/modal-options";
import {ModalService} from "../../services/modal.service";
import {fromEvent, Observable, zip} from "rxjs";

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements AfterViewInit {
  private modal = viewChild<ElementRef<HTMLDivElement>>('modal');
  private overlay = viewChild<ElementRef<HTMLDivElement>>('overlay');

  private modalAnimationEnd: Observable<Event> | null = null;
  private modalLeaveAnimation: string | null = null;
  private overlayLeaveAnimation: string | null = null;
  private overlayAnimationEnd: Observable<Event> | null = null;
  private modalLeaveTiming: number | null = null;
  private overlayLeaveTiming: number | null = null;

  public options: ModalOptions | null = null;

  constructor(
    private readonly modalService: ModalService,
    private readonly element: ElementRef<Element>,
  ) {
  }

  public async ngAfterViewInit(): Promise<void> {
    await this.renderOptions();
  }

  @HostListener('document:keydown.escape')
  public async onEscapePressed(): Promise<void> {
    await this.modalService.close();
  }

  public async onClose(): Promise<void> {
    await this.modalService.close();
  }

  public async close(): Promise<void> {
    if (this.modalLeaveAnimation) {
      this.modal()!.nativeElement.style.animation = this.modalLeaveAnimation;
    }
    if (this.overlayLeaveAnimation) {
      this.overlay()!.nativeElement.style.animation = this.overlayLeaveAnimation;
    }

    if (
      !this.options?.animations?.modal?.leave &&
      !this.options?.animations?.overlay?.leave
    ) {
      this.element.nativeElement.remove();
      return;
    }

    // Remove element if not animated
    this.removeElementIfNoAnimation(
      this.modal()!.nativeElement,
      this.modalLeaveAnimation,
    );
    this.removeElementIfNoAnimation(
      this.overlay()!.nativeElement,
      this.overlayLeaveAnimation,
    );

    if ((this.modalLeaveTiming ?? 0) > (this.overlayLeaveTiming ?? 0)) {
      this.modalAnimationEnd?.subscribe(() => {
        this.element.nativeElement.remove();
      });
    } else if ((this.modalLeaveTiming ?? 0) < (this.overlayLeaveTiming ?? 0)) {
      this.overlayAnimationEnd?.subscribe(() => {
        this.element.nativeElement.remove();
      });
    } else {
      if (this.modalAnimationEnd && this.overlayAnimationEnd) {
        zip(this.modalAnimationEnd, this.overlayAnimationEnd).subscribe(() => {
          this.element.nativeElement.remove();
        });
      }
    }
  }

  private async renderOptions(): Promise<void> {
    const modal = this.modal()!.nativeElement;

    modal.style.animation = this.options?.animations?.modal?.enter ?? '';
    modal.style.width = this.options?.size?.width ?? 'auto';
    modal.style.maxWidth = this.options?.size?.maxWidth ?? 'auto';
    modal.style.minHeight = this.options?.size?.minHeight ?? 'auto';
    modal.style.height = this.options?.size?.height ?? 'auto';
    modal.style.maxHeight = this.options?.size?.maxHeight ?? 'auto';

    this.modalLeaveAnimation = this.options?.animations?.modal?.leave ?? '';
    this.overlayLeaveAnimation = this.options?.animations?.overlay?.leave ?? '';

    this.modalAnimationEnd = this.animationendEvent(modal);
    this.overlayAnimationEnd = this.animationendEvent(this.overlay()!.nativeElement);

    this.modalLeaveTiming = this.getAnimationTime(this.modalLeaveAnimation);
    this.overlayLeaveTiming = this.getAnimationTime(this.overlayLeaveAnimation);
  }

  private animationendEvent(element: HTMLDivElement) {
    return fromEvent(element, 'animationend');
  }

  private getAnimationTime(animation: string): number {
    let animationTime = 0;
    const splittedAnimation = animation.split(' ');
    for (const expression of splittedAnimation) {
      const currentValue = +expression.replace(/s$/, '');
      if (!isNaN(currentValue)) {
        animationTime = currentValue;
        break;
      }
    }

    return animationTime;
  }

  private removeElementIfNoAnimation(element: HTMLDivElement, animation: string | null): void {
    if (!animation) {
      element.remove();
    }
  }
}
