// Importa los tipos y APIs utilizados por este script.
using UnityEngine;

// Detecta el objeto correcto y activa una respuesta audiovisual.
public class ObjectPlacementTrigger : MonoBehaviour
{
    [Header("Objeto esperado")]
    // Guarda la etiqueta que debe tener el objeto activador.
    [SerializeField] private string requiredTag = "InteractiveObject";

    [Header("Respuesta visual")]
    // Referencia el objeto visual que se mostrará al activar la secuencia.
    [SerializeField] private GameObject projectionObject;
    // Referencia la luz que se encenderá durante la respuesta.
    [SerializeField] private Light activationLight;

    [Header("Respuesta sonora")]
    // Referencia el componente que reproducirá el sonido.
    [SerializeField] private AudioSource audioSource;
    // Guarda el clip reproducido al completar la activación.
    [SerializeField] private AudioClip activationClip;

    // Registra si la secuencia ya se ejecutó para evitar repeticiones.
    private bool activated = false;

    // Unity ejecuta este método cuando otro Collider entra en el trigger.
    private void OnTriggerEnter(Collider other)
    {
        // Comprueba si la secuencia ya se ejecutó.
        // Si ya estaba activada, termina aquí para evitar repetir luces y sonidos.
        if (activated)
        {
            // Termina el método sin ejecutar las instrucciones posteriores.
            return;
        }

        // Comprueba que el objeto que entró en la zona tenga la etiqueta esperada.
        // Solo el objeto correcto puede iniciar la secuencia de activación.
        // El collider puede estar en un hijo del objeto agarrable.
        Rigidbody body = other.attachedRigidbody;
        if (body == null)
        {
            return;
        }

        // La etiqueta se asigna al GameObject que contiene el Rigidbody.
        if (body.CompareTag(requiredTag))
        {
            activated = true;
            ActivateSequence();
        }
    }

    // Activa de forma segura las respuestas visuales y sonoras.
    private void ActivateSequence()
    {
        // Comprueba que el objeto de proyección esté asignado en el Inspector.
        // Si falta, se omite este efecto visual y se evita un error.
        if (projectionObject != null)
        {
            projectionObject.SetActive(true);
        }

        // Comprueba que la luz de activación esté asignada en el Inspector.
        // Si existe, puede encenderla; si falta, continúa sin provocar un error.
        if (activationLight != null)
        {
            activationLight.enabled = true;
        }

        // Comprueba que el reproductor de audio y el clip de sonido estén asignados.
        // Si falta alguno de los dos, el sonido no se reproduce y se evita un error.
        if (audioSource != null && activationClip != null)
        {
            // Reproduce el clip una vez sin sustituir permanentemente el clip del AudioSource.
            audioSource.PlayOneShot(activationClip);
        }
    }
}