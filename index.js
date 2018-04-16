/**
 * Kubernetes API実行 Lambda関数
 * index.js
 */

// Import Packages
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Import Client & Configuration
const Client = require('kubernetes-client').Client
const config = require('kubernetes-client').config;
const client = new Client({ config: config.fromKubeconfig(), version: '1.9' });

/**
 * 既存のKubernetesオブジェクトの一覧を取得する。
 * @param {String} name_space 名前空間名
 */
async function listExistingK8sObj(name_space) {
  console.log('List Existing Objects...');

  const deployment = await client.apis.apps.v1.namespaces(name_space).deployments.get();
  console.log('Deployment', deployment);

  const svc = await client.api.v1.namespaces(name_space).services.get();
  console.log('Services', svc);

  console.log('Finished Listing Objects...');
}

/**
 * 既存のKubernetesオブジェクトの削除する。
 * @param {String} name_space 名前空間名
 * @param {String} obj_name オブジェクト名
 */
async function deleteExistingK8sObj(name_space, obj_name) {
  console.log('Delete Existing Objects...');

  const deployment = await client.apis.apps.v1.namespaces(name_space).deployments(obj_name).delete();
  console.log('Deployments Deleted...', deployment);

  const svc = await client.api.v1.namespaces(name_space).services(obj_name).delete();
  console.log('Services Deleted...', svc);

  console.log('Finished Deleting Objects...');
}

/**
 * 新規でKubernetesオブジェクトをYAMLから作成する。
 * @param {String} name_space 名前空間名
 * @param {Object} manifest_objs Kubernetesオブジェクトの集合
 */
async function createNewK8sObj(name_space, manifest_objs) {
  console.log('Create New Kubernetes Objects...');

  const deployment = await client.apis.apps.v1.namespaces(namespace).deployments.post({ body: manifest_objs.deployment });
  console.log('Deployments Created...', deployment);

  const svc = await client.api.v1.namespaces(namespace).services.post({ body: manifest_objs.svc });
  console.log('Services Created...', svc);

  console.log('Finished Creating Objects...');
}

/**
 * Lambda関数本体。Kubernetesに各種オブジェクトをデプロイする。
 * @param {Object} event Lambdaのイベントデータオブジェクト
 * @param {Object} contexts Lambdaのランライム情報オブジェクト
 * @param {Object} callback コールバックオプション
 */
exports.deployK8sObj = function(event, contexts, callback) {

  // オブジェクト定義の読み込み
  const deploymentManifest = yaml.safeLoad(fs.readFileSync(path.resolve('./cluster/nginx_deployment.yml')), 'utf-8');
  const serviceManifest = yaml.safeLoad(fs.readFileSync(path.resolve('./cluster/nginx_service.yml')), 'utf-8');
  const manifest_objs = {
    'deployment': deploymentManifest,
    'svc': serviceManifest
  };

  // 定数設定
  // 名前空間はとりあえずdefault固定
  const NAME_SPACE = 'default';

  /*************** 本処理 ここから ***************/

  listExistingK8sObj(NAME_SPACE)
    // Deploymentの名前=Servicesの名前なので, deploymentのメタデータから名前参照
    .then(deleteExistingK8sObj(NAME_SPACE, manifest_objs.deployment.metadata.name))
    .then(createNewK8sObj(NAME_SPACE, manifest_objs))
    .then(listExistingK8sObj(NAME_SPACE))
    .then(callback(null, 'Deploy Func Finished! Check Your Cluster!!'))
    .catch((err) => callback(err));

  /*************** 本処理 ここまで ***************/
}