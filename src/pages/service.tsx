import { Dialog, Transition } from '@headlessui/react';
import { FiChevronDown, FiExternalLink, FiTrash2 } from 'react-icons/fi';
import { Fragment, useState } from 'react';
import {
  GetContributeServiceResponse,
  PostContributeServiceResponse,
} from '../modules/Contribute/interfaces';

import Button from 'modules/Common/components/Button';
import Drawer from 'components/Drawer';
import { FiArrowRight as IconArrowRight } from 'react-icons/fi';
import IframeSelector from 'components/IframeSelector';
import LinkIcon from 'modules/Common/components/LinkIcon';
import Loading from 'components/Loading';
import React from 'react';
import TextContent from 'modules/Common/components/TextContent';
import { Trans } from 'react-i18next';
import api from 'utils/api';
import classNames from 'classnames';
import { getDocumentTypes } from 'modules/Github/api';
import s from './service.module.css';
import sDialog from '../../src/modules/Common/components/Dialog.module.css';
import { useEvent } from 'react-use';
import useNotifier from 'hooks/useNotifier';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useToggle } from 'react-use';
import { useTranslation } from 'next-i18next';
import useUrl from 'hooks/useUrl';
import { withI18n } from 'modules/I18n';

const EMAIL_SUPPORT = 'contribute@opentermsarchive.org';

const ServicePage = ({ documentTypes }: { documentTypes: string[] }) => {
  let [isOpen, setIsOpen] = useState(true);

  const closeModal = () => {
    setIsOpen(false);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const router = useRouter();
  const { t } = useTranslation();
  const { notify } = useNotifier();
  const {
    queryParams: {
      destination,
      localPath,
      versionsRepo,
      url,
      step: initialStep,
      selectedCss: initialSelectedCss,
      removedCss: initialRemovedCss,
      documentType: initialDocumentType,
      name: initialName,
      expertMode,
    },
    pushQueryParam,
  } = useUrl();
  const commonUrlParams = `destination=${destination}${localPath ? `&localPath=${localPath}` : ''}${
    versionsRepo ? `&versionsRepo=${versionsRepo}` : ''
  }`;
  useEvent('touchstart', () => {
    router.push(`/sorry?${commonUrlParams}`);
  });

  if (!destination && typeof window !== 'undefined') {
    // This is here as previously created issues still point at a url that has no `destination` param
    pushQueryParam('destination')('OpenTermsArchive/services-all');
  }

  const json = {
    name: initialName || '???',
    documents: {
      [initialDocumentType || '???']: {
        fetch: url,
        select: initialSelectedCss,
        remove: initialRemovedCss,
      },
    },
  };

  const [isPdf, toggleIsPdf] = useToggle(/\.pdf$/gi.test(url));

  const [selectable, toggleSelectable] = React.useState('');
  const [iframeReady, toggleIframeReady] = useToggle(false);
  const [loading, toggleLoading] = useToggle(false);
  const [step, setStep] = React.useState<number>(initialStep ? +initialStep : 1);

  const selectedCss = !initialSelectedCss
    ? []
    : Array.isArray(initialSelectedCss)
    ? initialSelectedCss
    : [initialSelectedCss];

  const removedCss = !initialRemovedCss
    ? []
    : Array.isArray(initialRemovedCss)
    ? initialRemovedCss
    : [initialRemovedCss];

  // const data = { url: 'http://localhost:3000' };
  const { data } = useSWR<GetContributeServiceResponse>(
    isPdf ? null : `/api/services?url=${encodeURIComponent(url)}`,
    {
      initialData: {
        status: 'ko',
        message: '',
        url: '',
        error: '',
      },
      revalidateOnMount: true,
    }
  );

  const passToStep = (newStep: number) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    pushQueryParam('step')(newStep);
    setStep(newStep);
  };

  const selectInIframe = (queryparam: 'selectedCss' | 'removedCss') => () => {
    toggleSelectable(queryparam);
  };

  const onSelect = React.useCallback(
    (cssPath: string) => {
      const cssRules = selectable === 'selectedCss' ? selectedCss : removedCss;

      if (!cssRules.includes(cssPath)) {
        pushQueryParam(selectable)([...cssRules, cssPath]);
      }
      toggleSelectable('');
    },
    [url, removedCss, selectedCss, pushQueryParam, selectable, toggleSelectable]
  );

  const onChangeCssRule = (queryparam: 'selectedCss' | 'removedCss', index: number) => (e: any) => {
    const value = e.target?.value;
    if (!value) {
      onRemoveCssRule(queryparam, index)();
      return;
    }
    const cssRules = queryparam === 'selectedCss' ? selectedCss : removedCss;
    const newCss = [...cssRules];
    newCss[index] = value;
    pushQueryParam(queryparam)(newCss);
  };

  const onRemoveCssRule = (queryparam: 'selectedCss' | 'removedCss', index: number) => () => {
    const cssRules = queryparam === 'selectedCss' ? selectedCss : removedCss;
    const newCss = [...cssRules];
    delete newCss[index];
    pushQueryParam(queryparam)(newCss);
  };

  const onInputChange = (fieldName: string) => (event: any) => {
    pushQueryParam(fieldName)(event.target.value);
  };

  const toggleExpertMode = () => {
    pushQueryParam('expertMode')(!!expertMode ? '' : 'true');
  };

  const onValidate = async () => {
    toggleLoading(true);
    try {
      const {
        data: { url, message },
      } = await api.post<PostContributeServiceResponse>('/api/services', {
        destination,
        json,
        name: initialName,
        documentType: initialDocumentType,
        url: `${window.location.href}&expertMode=true`,
      });

      if (!url) {
        const subject = 'Here is a new service to track in Open Terms Archive';
        const body = `Hi,

  I need you to track "${initialDocumentType}" of "${initialName}" for me.

  Here is the url ${window.location.href}&expertMode=true

  Thank you very much`;
        notify(
          'error',
          <>
            {t('service:could_not_create_issue')} <em>({message})</em>
            <br />
            <Button
              onClick={() => {
                window.open(
                  `mailto:${EMAIL_SUPPORT}?subject=${subject}&body=${encodeURIComponent(body)}`,
                  '_blank'
                );
              }}
            >
              {t('service:send_email')}
            </Button>
          </>,
          { autoClose: 10000 }
        );
        return;
      }
      router.push(`/thanks?${commonUrlParams}&url=${encodeURIComponent(url)}`);
    } catch (e: any) {
      notify('error', e.toString());
      toggleLoading(false);
    }
  };

  const onErrorClick = () => {
    const subject = 'I tried to add this service but it did not work';
    const body = `Hi,

I need you to track "${initialDocumentType}" of "${initialName}" for me but I had a failure with.

-----
${data?.error}
-----

Here is the url ${window.location.href}&expertMode=true

Thank you very much`;

    window.open(
      `mailto:${EMAIL_SUPPORT}?subject=${subject}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  };

  const saveOnLocal = async () => {
    await api.post('/api/services', {
      versionsRepo,
      path: localPath,
      data: JSON.stringify(json),
    });
  };

  const submitDisabled = !initialSelectedCss || !iframeReady || loading;

  React.useEffect(() => {
    if (!!data?.isPdf) {
      toggleIsPdf(true);
    }
  }, [data?.isPdf]);

  React.useEffect(() => {
    toggleIframeReady(false);
  }, [url]);

  return (
    <div className={s.wrapper}>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className={classNames(sDialog.dialog)} onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className={classNames(sDialog.dialog_overlay)} />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className={classNames(sDialog.dialog_content)}>
              <Dialog.Title as="h3">{t('service:dialog.start.title')}</Dialog.Title>
              <Dialog.Description>
                <TextContent>
                  <p>
                    <Trans i18nKey="service:dialog.start.p1">
                      Most of the time, contractual documents contains a header, a footer,
                      navigation menus, possibly ads… We aim at tracking only{' '}
                      <strong>the significant parts of the document</strong>
                    </Trans>
                  </p>
                  <p>
                    <Trans i18nKey="service:dialog.start.p2">
                      In order to achieve that, you will have to select the part of the documents
                      that contains the relevant part and remove the insignificant parts.
                    </Trans>
                  </p>
                </TextContent>
              </Dialog.Description>
              <div className="mt__L text__right">
                <Button onClick={closeModal}>{t('service:dialog.start.cta')}</Button>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
      <Drawer className={s.drawer}>
        <>
          <nav>
            <LinkIcon
              className={s.backButton}
              iconColor="var(--colorBlack400)"
              href={`/?${commonUrlParams}`}
              direction="left"
              small={true}
            >
              {t('service:back')}
            </LinkIcon>
          </nav>
          <div>
            <form>
              <div>
                <div className={classNames('formfield')}>
                  <label>{t('service:step2.form.url')}</label>
                  <div className={classNames('select')}>
                    <input defaultValue={url} onChange={onInputChange('url')} />
                  </div>
                </div>
                <h3>{t('service:step2.title')}</h3>

                <div className={classNames('formfield')}>
                  <label>{t('service:step2.form.documentType')}</label>
                  <div className={classNames('select')}>
                    <select
                      onChange={onInputChange('documentType')}
                      defaultValue={initialDocumentType}
                    >
                      <option value="">{t('service:step2.form.select')}</option>
                      {documentTypes.map((documentType) => (
                        <option key={documentType} value={documentType}>
                          {documentType}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown color="333333"></FiChevronDown>
                  </div>
                </div>

                <div className={classNames('formfield')}>
                  <label>{t('service:step2.form.serviceName')}</label>
                  <input defaultValue={initialName} onChange={onInputChange('name')} />
                </div>
                {!isPdf && (
                  <>
                    <h3>{t('service:step3.title')}</h3>

                    <div className={classNames('formfield')}>
                      <label>{t('service:step3.form.significantPart')}</label>
                      {selectedCss.map((selected, i) => (
                        <div key={selected} className={s.selectionItem}>
                          <input
                            defaultValue={selected}
                            onChange={onChangeCssRule('selectedCss', i)}
                          />

                          <Button
                            onClick={onRemoveCssRule('selectedCss', i)}
                            type="secondary"
                            onlyIcon={true}
                          >
                            <FiTrash2></FiTrash2>
                          </Button>
                        </div>
                      ))}
                      <Button
                        onClick={selectInIframe('selectedCss')}
                        disabled={!!selectable || !iframeReady}
                        type="secondary"
                      >
                        {t('service:step3.form.significantPart.cta')}
                      </Button>
                    </div>

                    <div className={classNames('formfield')}>
                      <label>{t('service:step3.form.insignificantPart')}</label>
                      {removedCss.map((selected, i) => (
                        <div key={selected} className={s.selectionItem}>
                          <input
                            defaultValue={selected}
                            onChange={onChangeCssRule('removedCss', i)}
                          />

                          <Button
                            onClick={onRemoveCssRule('removedCss', i)}
                            type="secondary"
                            onlyIcon={true}
                          >
                            <FiTrash2></FiTrash2>
                          </Button>
                        </div>
                      ))}
                      <Button
                        onClick={selectInIframe('removedCss')}
                        disabled={!!selectable || !iframeReady}
                        type="secondary"
                      >
                        {t('service:step3.form.insignificantPart.cta')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
              {expertMode && (
                <>
                  <pre className={classNames(s.json)}>{JSON.stringify(json, null, 2)}</pre>
                  <div className={classNames(s.expertButtons)}>
                    {localPath && (
                      <Button
                        onClick={saveOnLocal}
                        size="sm"
                        type="secondary"
                        title={`Save on ${localPath}`}
                      >
                        {t('service:expertMode.button.label')}
                      </Button>
                    )}
                    <a href={url} target="_blank" rel="noopener" title={url}>
                      <FiExternalLink />
                    </a>
                  </div>
                </>
              )}
            </form>
          </div>
          <nav>
            <a className="a__small" onClick={toggleExpertMode}>
              {t('service:expertMode')}
            </a>
            <Button disabled={submitDisabled} onClick={onValidate}>
              {loading ? '...' : t('service:submit')}
            </Button>
          </nav>
        </>
      </Drawer>
      {data?.error && (
        <div className={s.fullPage}>
          <h1>{t('service:error.title')}</h1>
          <p>{data?.error}</p>
          <Button onClick={onErrorClick}>{t('service:error.cta')}</Button>
        </div>
      )}
      {!data?.error && (
        <>
          {data?.url || isPdf ? (
            isPdf ? (
              <iframe src={url} width="100%" style={{ height: '100vh' }} />
            ) : (
              <IframeSelector
                selectable={!!selectable}
                url={isPdf ? url : data?.url}
                selected={selectedCss}
                removed={removedCss}
                onSelect={onSelect}
                onReady={toggleIframeReady}
              />
            )
          ) : (
            <div className={s.fullPage}>
              <h1>{t('service:loading.title')}</h1>
              <p>{t('service:loading.subtitle')}</p>
              <Loading />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const getStaticProps = withI18n()(async (props: any) =>
  JSON.parse(
    JSON.stringify({
      props: { ...props, documentTypes: await getDocumentTypes() },
    })
  )
);

export default ServicePage;