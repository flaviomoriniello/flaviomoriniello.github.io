using UnityEngine; // Importa GameObject, Transform, vectores, cámara y demás tipos básicos de Unity.

// No lee toques: recibe ordenes del unico gestor PlaceOnPlane.
public class ARObjectGestureManipulator : MonoBehaviour // Define el componente del prefab que ejecuta rotación y escala sin leer la pantalla.
{ // Abre la clase.
    [SerializeField] private float rotationSpeed = 0.2f; // Define cuántos grados rota el objeto por cada píxel horizontal del gesto.
    [SerializeField] private float minScale = 0.05f; // Define el límite mínimo de escala uniforme de la raíz del prefab.
    [SerializeField] private float maxScale = 1.5f; // Define el límite máximo de escala uniforme de la raíz del prefab.

    public void RotateBy(float horizontalPixels) // Expone el método que recibe del gestor un desplazamiento horizontal en píxeles.
    { // Abre el método.
        transform.Rotate(Vector3.up, -horizontalPixels * rotationSpeed, Space.World); // Rota alrededor del eje vertical del mundo; el signo negativo establece el sentido del giro.
    } // Cierra el método.

    public void ScaleBy(float factor) // Expone el método que recibe la proporción de escala calculada con la pinza.
    { // Abre el método.
        if (factor <= 0f || float.IsNaN(factor) || float.IsInfinity(factor)) return; // Rechaza factores negativos, cero, no numéricos o infinitos antes de cambiar la escala.
        float minimum = Mathf.Max(0.001f, minScale); // Garantiza que el mínimo de escala sea positivo aunque se configure mal en el Inspector.
        float maximum = Mathf.Max(minimum, maxScale); // Garantiza que el máximo no sea menor que el mínimo.
        float size = Mathf.Clamp(transform.localScale.x * factor, minimum, maximum); // Multiplica la escala actual por el factor y limita el resultado al intervalo permitido.
        transform.localScale = Vector3.one * size; // Aplica el mismo tamaño a X, Y y Z para mantener las proporciones del objeto.
    } // Cierra el método.
} // Cierra la clase.
