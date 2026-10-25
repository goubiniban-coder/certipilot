"use client";

import { createContext, useContext, useTransition } from "react";

const PendingContext = createContext(false);

/** True while the enclosing ActionForm is submitting. */
export function useActionFormPending() {
  return useContext(PendingContext);
}

/**
 * Form bound to a `useActionState` dispatcher. Unlike `<form action>`, it does
 * not reset the fields after submission, so the user keeps what they typed
 * when the server answers with an error.
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (formData: FormData) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...props}
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const formData = new FormData(event.currentTarget, submitter);
          startTransition(() => action(formData));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}
