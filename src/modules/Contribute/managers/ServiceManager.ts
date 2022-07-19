import { createPull } from 'modules/Github/api';
import snakeCase from 'lodash/fp/snakeCase';

export const addService = async ({
  destination,
  name,
  documentType,
  json,
}: {
  destination: string;
  name: string;
  documentType: string;
  json: any;
}) => {
  if (!destination) {
    return {};
  }
  const [githubOrganization, githubRepository] = (destination || '')?.split('/');

  const commonParams = {
    owner: githubOrganization,
    repo: githubRepository,
    accept: 'application/vnd.github.v3+json',
  };

  const prTitle = `Add ${name} - ${documentType}`;
  const filePath = `declarations/${name}.json`;

  return createPull({
    ...commonParams,
    targetBranch: 'main',
    newBranch: snakeCase(prTitle),
    title: prTitle,
    content: Buffer.from(`${JSON.stringify(json, null, 2)}\n`).toString('base64'),
    filePath,
  });
};
