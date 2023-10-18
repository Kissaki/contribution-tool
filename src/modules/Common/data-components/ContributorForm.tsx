import Container from 'modules/Common/containers/Container';
import { MDXRemote } from 'next-mdx-remote';
import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import classNames from 'classnames';
import s from './Version.module.css';
import sButton from 'modules/Common/components/Button.module.css';
import { useLocalStorage } from 'react-use';
import useTranslation from 'next-translate/useTranslation';
import getConfig from 'next/config';
const { publicRuntimeConfig } = getConfig();

interface Contributor {
  name: string;
  email: string;
}

type ContributorFormProps = {
  onContributorChange: (contributor: Contributor) => any;
  onSubmitDocument?: any;
  mdxContent: any;
} & React.HTMLAttributes<HTMLDivElement>;

type FormElements = HTMLFormControlsCollection & {
  name: HTMLInputElement;
  email: HTMLInputElement;
};

export const useContributor = () => {
  const [email, setEmail] = useLocalStorage<string>(
    'contributor-email',
    publicRuntimeConfig.author.email
  );
  const [name, setName] = useLocalStorage<string>(
    'contributor-name',
    publicRuntimeConfig.author.name
  );

  return {
    email,
    name,
    setEmail,
    setName,
  };
};

const ContributorForm: React.FC<ContributorFormProps> = ({
  className,
  onContributorChange,
  onSubmitDocument,
  mdxContent,
  ...props
}) => {
  const { email, setEmail, name, setName } = useContributor();
  const { t } = useTranslation();

  const onChangeContributor = ({ name, email }: Contributor) => {
    setEmail(email);
    setName(name);
    onContributorChange({ name, email });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (onSubmitDocument) {
      onSubmitDocument();
    } else {
      const { email, name } = (event.target as HTMLFormElement).elements as FormElements;

      onChangeContributor({ email: email.value, name: name.value });
    }
  };

  return (
    <Container gridCols="8" gridGutters="7">
      <TextContent className={classNames(s.markdown, className)} {...props}>
        {mdxContent && (
          <MDXRemote
            {...mdxContent}
            components={{
              ContributorFormFields: () => (
                <form onSubmit={onSubmit} className="mt__XL mb__XL">
                  <div className="formfield">
                    <label htmlFor="id">{t('contributor-form:field.name.label')}</label>
                    <input
                      required
                      id="name"
                      name="name"
                      type="name"
                      placeholder={publicRuntimeConfig.author.name}
                      defaultValue={name}
                    />
                  </div>
                  <div className="formfield">
                    <label htmlFor="email">{t('contributor-form:field.email.label')}</label>
                    <input
                      required
                      id="email"
                      name="email"
                      type="email"
                      placeholder={publicRuntimeConfig.author.email}
                      defaultValue={email}
                    />
                  </div>
                  <div className="formfield formfield__alignRight">
                    <input
                      type="submit"
                      className={classNames(sButton.button)}
                      value={t('contributor-form:submit')}
                    />
                  </div>
                </form>
              ),
              UpdateButton: ({ children }: any) => (
                <div className="formfield">
                  <input type="submit" className={classNames(sButton.button)} value={children} />
                </div>
              ),
            }}
          />
        )}
      </TextContent>
    </Container>
  );
};

export default ContributorForm;
