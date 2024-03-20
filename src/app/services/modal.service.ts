import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  TemplateRef, Type,
  ViewContainerRef
} from '@angular/core';
import {ModalComponent} from "../components/modal/modal.component";
import {ModalOptions} from "../types/modal-options";
import {interval} from "rxjs";
import {globalAppView} from "../global-app-view";

// https://medium.com/@greenFlag/how-to-easily-and-quickly-create-a-modal-in-angular-a2f82d5c11f6
@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private locked: boolean = false;
  private modals: ComponentRef<ModalComponent>[] = [];

  private zIndex = 2;

  constructor(
    private readonly app: ApplicationRef,
    private readonly injector: EnvironmentInjector,
  ) {
  }


  public open(content: TemplateRef<Element>, options?: ModalOptions): void {
    const innerContent = globalAppView()!.createEmbeddedView(content);

    options = this.assignDefaultOptions(options);

    const modal = globalAppView()!.createComponent(ModalComponent, {
      environmentInjector: this.injector,
      projectableNodes: [innerContent.rootNodes],
    });
    modal.instance.options = options ?? null;
    this.modals.push(modal);
  }

  public async close(): Promise<void> {
    await this.lock();
    if (!this.modals.length) {
      return;
    }
    await this.modals[this.modals.length - 1].instance.close();
    this.modals.pop();
    this.releaseLock();
  }

  private assignDefaultOptions(options: ModalOptions | undefined): ModalOptions {
    options ??= {};
    options.animations ??= {};
    options.animations.modal ??= {};
    options.animations.modal.enter ??= 'enter-slide-down 0.8s';
    options.animations.overlay ??= {};
    options.animations.overlay.enter ??= 'fade-in 0.8s';
    options.animations.overlay.leave ??= 'fade-out 0.3s forwards';
    options.size ??= {};
    options.zIndex ??= this.zIndex++;

    return options;
  }

  private lock(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const subscription = interval(100).subscribe(() => {
        if (!this.locked) {
          this.locked = true;
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  private releaseLock() {
    this.locked = false;
  }
}
