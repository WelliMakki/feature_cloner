import { CloneContext, StackCloneOptions } from '../cloneContext';

export interface CloneHandler {
  id: string;
  canHandle(context: CloneContext): Promise<boolean>;
  collectOptions(context: CloneContext): Promise<StackCloneOptions | undefined>;
}

