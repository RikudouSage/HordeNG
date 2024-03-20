import {signal, ViewContainerRef} from "@angular/core";

// todo find a way to do it without this hack
export const globalAppView = signal<ViewContainerRef | null>(null);
