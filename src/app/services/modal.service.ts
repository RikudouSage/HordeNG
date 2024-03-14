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

// https://medium.com/@greenFlag/how-to-easily-and-quickly-create-a-modal-in-angular-a2f82d5c11f6
@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private newModalComponent: ComponentRef<ModalComponent> | null = null;

  constructor(
    private readonly app: ApplicationRef,
    private readonly injector: EnvironmentInjector,
  ) {
  }


  public open(view: ViewContainerRef, content: TemplateRef<Element>, options?: ModalOptions): void {
    view.clear();
    const innerContent = view.createEmbeddedView(content);

    options = this.assignDefaultOptions(options);

    this.newModalComponent = view.createComponent(ModalComponent, {
      environmentInjector: this.injector,
      projectableNodes: [innerContent.rootNodes],
    });
    this.newModalComponent.instance.options = options ?? null;
  }

  public async close(): Promise<void> {
    if (!this.newModalComponent) {
      return;
    }
    await this.newModalComponent.instance.close();
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

    return options;
  }
}
