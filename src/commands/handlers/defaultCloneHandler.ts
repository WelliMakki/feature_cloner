import { CloneContext, StackCloneOptions } from '../cloneContext';
import { CloneHandler } from './cloneHandler';

export class DefaultCloneHandler implements CloneHandler {
  id = 'default';

  async canHandle(_context: CloneContext): Promise<boolean> {
    return true;
  }

  async collectOptions(_context: CloneContext): Promise<StackCloneOptions> {
    return {};
  }
}

