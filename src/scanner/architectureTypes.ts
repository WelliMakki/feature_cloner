/**
 * Architecture pattern definitions and detection rules
 */

export interface ArchitecturePattern {
  name: string;
  description: string;
  confidence: number;
  layers: LayerInfo[];
}

export interface LayerInfo {
  name: string;
  path: string;
  fileCount: number;
  fileTypes: string[];
}

export interface DetectionRule {
  name: string;
  folderPatterns: string[];
  filePatterns: string[];
  minConfidence: number;
}

/**
 * Common architecture detection rules
 */
export const ARCHITECTURE_RULES: DetectionRule[] = [
  {
    name: 'Flutter Riverpod',
    folderPatterns: ['data', 'domain', 'presentation', 'providers'],
    filePatterns: ['_model.dart', '_repository.dart', '_notifier.dart', '_provider.dart', '_state.dart'],
    minConfidence: 70
  },
  {
    name: 'Clean Architecture',
    folderPatterns: ['data', 'domain', 'presentation'],
    filePatterns: ['_model', '_repository', '_usecase', '_entity'],
    minConfidence: 60
  },
  {
    name: 'MVC',
    folderPatterns: ['models', 'views', 'controllers'],
    filePatterns: ['model', 'view', 'controller'],
    minConfidence: 60
  },
  {
    name: 'MVVM',
    folderPatterns: ['models', 'views', 'viewmodels'],
    filePatterns: ['model', 'view', 'viewmodel'],
    minConfidence: 60
  },
  {
    name: 'MVC Express',
    folderPatterns: ['models', 'routes', 'controllers'],
    filePatterns: ['.js', '.ts', 'model', 'controller', 'route'],
    minConfidence: 60
  },
  {
    name: 'React Feature',
    folderPatterns: ['components', 'hooks', 'utils'],
    filePatterns: ['.tsx', '.jsx', '.ts', '.js'],
    minConfidence: 50
  },
  {
    name: 'Vertical Slice',
    folderPatterns: ['api', 'services', 'components', 'types'],
    filePatterns: ['.ts', '.tsx', '.js', '.jsx'],
    minConfidence: 40
  }
];

/**
 * Common folder naming patterns
 */
export const COMMON_LAYER_NAMES = [
  'data', 'domain', 'presentation', 'providers',
  'models', 'views', 'controllers', 'viewmodels',
  'components', 'screens', 'widgets', 'hooks',
  'services', 'repositories', 'api', 'utils',
  'types', 'interfaces', 'entities', 'usecases'
];

/**
 * Common file suffix patterns
 */
export const COMMON_FILE_PATTERNS = [
  '_model', '_repository', '_provider', '_notifier', '_state',
  '_controller', '_view', '_viewmodel', '_service',
  '_screen', '_widget', '_component', '_hook',
  '.model', '.repository', '.service', '.controller',
  '.component', '.view', '.viewmodel'
];

